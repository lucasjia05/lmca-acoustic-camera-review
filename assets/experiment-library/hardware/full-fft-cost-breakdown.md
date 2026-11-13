# Pipeline cost breakdown — November 11, 2026

**PDM-to-PCM conversion dominates logic area. DAS dominates processing cycles
and coefficient storage.** These are distinct optimization targets.

Configuration: 30 microphones, PCM 192 kHz, PDM decimation 16/CIC3/identity FIR,
FFT512/hop256, 67 selected bins, 441 directions, 4096-sample observation,
2048-sample map hop, 15 FFT frames per map. Functional RTL and coefficients were
not changed. No precision, image resolution, or algorithm parameters were reduced.

## Logic area

Gate equivalents are mapped standard-cell area divided by the library NAND2X1
area (1.8772 square micrometers). Large memories are **excluded** from these numbers.

| Block | NAND2 equivalents | Share |
|---|---:|---:|
| PDM-to-PCM conversion | 209,324 | 61.25% |
| DAS | 47,498 | 13.90% |
| FFT | 38,785 | 11.35% |
| Spectrum storage/selection logic | 31,792 | 9.30% |
| PCM serializer | 5,860 | 1.71% |
| Window | 4,221 | 1.24% |
| Pipeline/top control | 2,274 | 0.67% |
| Frame buffer control/addressing | 1,980 | 0.58% |
| **Total, before rounding individual rows** | **341,733** | **100%** |

Retaining the module hierarchy produces a total only **0.292% higher** than the
previous flattened result of 340,737 equivalents. This supports using the block
ranking and approximate shares; it is not an exact attribution of the earlier
netlist, because optimization changes at module boundaries.

The PDM block has 30 parallel CIC/filter channels. Its 5,914 flip-flops account
for approximately 25,135 equivalents; the remaining approximately 184,189 are
combinational logic. Thus its large cost is not primarily the small CIC state
being stored in flip-flops. Generic 128-bit rounding/saturation operations repeated
across channels are a concrete investigation target. This measurement does not
yet quantify how much an equivalent narrower implementation would save.

The default FIR is identity. This is not a full noise-rejection or CIC compensation
filter whose functionality explains the entire PDM area. Changing to time-domain
beamforming would leave the PDM front end in place.

## Storage, separate from the logic estimate

| Storage | Size |
|---|---:|
| Observation PCM buffer | 240 KiB RAM |
| All positive-bin spectra | 45.18 KiB RAM |
| FFT working buffer | 3 KiB RAM |
| DAS map accumulator | 3.45 KiB RAM |
| Bin energy buffer | 1.69 KiB RAM |
| **Total inferred large RAM** | **293.315 KiB** |
| Steering coefficients | 3.804 MiB ROM |
| **Total inferred large ROM** | **3.806 MiB** |

These counts match the original memory inventory exactly. Arrays are not yet
implemented as physical macros. Port requirements, buffering, availability of
memory generators, and macro area still need architectural work. In particular,
the FFT arrays currently expose multiple read/write ports. The static-bin mode
also warrants checking whether energy bookkeeping can be removed: exposing memory
ports for measurement can retain logic that full integrated optimization would
eliminate.

## Processing cycles

Passive counters were added to a separate copy of the existing full-pipeline
testbench. Both maps still pass all original PCM/window/FFT/bin/map comparisons,
handshake checks, output stability checks, and clipping checks. Total testbench
cycles remain exactly 30,436,258, matching the original verification run.

| Stage, per map after capture | Cycles | Share |
|---|---:|---:|
| FFT input/window feeding, transforms and draining | 1,382,850 | 9.14% |
| Selection/start transitions outside DAS wait | 45 | <0.01% |
| DAS computation and output emission | 13,739,991 | 90.86% |
| **Total post-capture processing** | **15,122,886** | **100%** |

Within those counts, there are exactly 1,036,800 FFT butterflies, 13,296,150 DAS
microphone complex MAC cycles, and 443,205 DAS bin-power cycles per map. These
match the loop dimensions independently calculated from the configuration.
The two maps have identical post-capture counts.

These are cycle counts, not an achieved clock rate. The testbench source supplies
handshaked PDM words without pacing them at the physical microphone sample rate;
its capture cycle count is not a real acquisition duration. The pipeline is still
a batch implementation, not continuous microphone capture. Memory macros and
their access latency, external memory, CDC/pad handling, and physical timing are
not modeled in this throughput result.

## Recommended next experiment

1. Simplify and right-size the PDM arithmetic while preserving numerical behavior
   and keeping all microphones and image parameters unchanged. Reverify and map.
2. Address observation buffering and steering storage as separate memory problems.
3. Improve DAS throughput if the chosen map-rate target requires it; its current
   serial MAC loop is the dominant processing-time cost.

This result does not require adopting the FFT paper or changing beamforming
algorithms. It does not establish a complete chip fit under a 300k-gate budget:
the area estimate still excludes memory macros and physical implementation.

## Evidence and reproduction

- `summary.json`: exact block totals, cycles, memory inventory, and SHA256 hashes
  matching all copied RTL/coefficient inputs to the original gate-estimate run.
- `dc_area.rpt`, `dc_cells.tsv`: mapped hierarchical area and leaf-cell inventory.
- `dc.log`, `dc_timing.rpt`: tool evidence; shell timing is not full-chip timing.
- `cost_cycles.csv`, `simulation.log`: measured stage counts and successful checks.
- `infer.ys`, `extract_hierarchy.py`, `shell.ys`, `dc.tcl`, `run.sh`: measurement flow.
- `measure_cycles.py`, `run_sim.sh`, `summarize.py`: instrumentation and summary.

Remote directory: `~/workspace/lmca-cost-20261111` on `EDA_SERVER`.
The flow uses the same Yosys/DC versions, educational gscl45nm library, excluded
zero-capacitance cells, medium map effort, and 100 ns clock constraint as the
original estimate. Standard-cell counts total 204,050 plus 794 logical constant
drivers; no unresolved arithmetic cells are counted. Leaf areas reconcile with
the DC report to within 0.01 square micrometers of text-output rounding.

Hierarchy-cell `area` attributes are absent in `dc_hierarchy.tsv`; that file only
identifies instance/reference names. Numerical totals use leaf cells and the
hierarchical area report, not those absent attributes.

After the original inputs have been copied to the remote directory:

```sh
bash run.sh
bash run_sim.sh
python3 summarize.py
```

The hierarchy shells are measurement artifacts. Use the original
`rtl/full_pipeline/src/*.sv` and generated baseline wrapper for an RTL block
diagram, not the extracted memory-port shells.
