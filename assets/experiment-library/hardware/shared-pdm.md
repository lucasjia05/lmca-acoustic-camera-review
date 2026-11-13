# Shared PDM-to-PCM converter — November 11, 2026

The production PDM converter now reuses a configurable number of filter datapaths
across microphones. The default is **one lane for 30 microphones**. Each microphone
still has independent CIC and FIR history; input bits are captured together before
the lane visits each microphone. PCM and map values remain bit-for-bit unchanged
in the checked scenarios.

## Area result

Same hierarchy-preserving flow, educational gscl45nm library, exclusions, 100 ns
constraint, and medium mapping effort as the previous block-cost investigation:

| Logic | Original parallel implementation | Shared, banked implementation |
|---|---:|---:|
| PDM conversion | 209,324 NAND2 equivalents | **62,711** |
| Full pipeline | 341,733 NAND2 equivalents | **195,118** |

That is approximately **70% less PDM logic** and **43% less total logic**. This
measures the combined effect of sharing, bounded arithmetic, and state banking;
it does not isolate the savings of each arithmetic rewrite.

The separately counted **293.315 KiB RAM and 3.806 MiB ROM are unchanged**. These
gate totals exclude large memory macros, pads, a clock tree, external-memory
interfaces and physical implementation. Being below 300k logic equivalents does
not establish that the complete design fits the chip.

## Implementation

- A capture cycle latches one simultaneous PDM bit per microphone.
- Each processing lane visits one microphone per clock. `pdm.lanes` selects
  1 through microphone count, including counts that do not divide evenly.
- Each CIC stage has its own bank of per-microphone integrator/comb state. This
  avoids a single flattened array with multiple simultaneous write ports.
- Normalization uses `CIC_W + PCM_FRAC + 2` bits, enough for sign, all scaled
  bits and rounding carry. FIR accumulation uses
  `PCM_W + COEF_W + ceil(log2(FIR_TAPS)) + 1` bits, plus a rounding extension.
- CIC wrapping, ties-to-even rounding, signed saturation, sticky clipping,
  reset behavior, and output backpressure semantics are retained.
- FIR taps are shared across microphones through the lane, but evaluated in
  parallel within each lane. The default FIR remains identity.

The global scheduler and lane count are new; the arithmetic transformation does
not lower input/output precision or alter decimation, filter coefficients, FFT,
bin selection, scan directions, or microphone count.

## Throughput tradeoff

With no output stall, a new parallel PDM vector is accepted every
`ceil(mics/lanes)+1` core clocks. These exact intervals were checked in simulation.

| Microphones | Lanes | Clocks/vector | Required core clock for 3.072 MHz PDM |
|---|---:|---:|---:|
| 30 | 1 | 31 | at least 95.232 MHz |
| 30 | 2 | 16 | at least 49.152 MHz |
| 30 | 3 | 11 | at least 33.792 MHz |
| 60 | 1 | 61 | at least 187.392 MHz |
| 60 | 4 | 16 | at least 49.152 MHz |

These are service-rate floors for this converter, **not achieved clocks** or
end-to-end continuous-capture guarantees. More lanes trade area for throughput.
The full pipeline still pauses acquisition while computing a map. That existing
batch architecture, memory access timing and physical input capture remain to
be addressed for live microphones.

The same two-map full-pipeline test takes **33,292,306 core cycles**, versus
30,436,258 originally (about 9.4% more). That includes artificial source gaps and
output stalls; it is not a wall-clock acquisition measurement or a new map-rate
claim. The FFT/DAS algorithms and their serial processing schedule are unchanged.

The dedicated relaxed-constraint PDM register-path report is
`synthesis_banked/dc_pdm_timing.rpt`; the machine-readable period estimate and
limitations are in `summary.json`. No placed-and-routed timing closure is claimed.
The PDM-only path estimate is **10.61 ns including setup**, approximately 94 MHz,
versus a required period of at most 10.50 ns for one lane at the current PDM rate.
Thus **one lane has not demonstrated the required timing margin**. More lanes
reduce the service-rate requirement; additional pipelining or timing optimization
is another option. The rest of the pipeline also needs its own timing closure.

## Verification

- **15 full-pipeline scenarios pass**, including the complete 30-microphone
  configuration on the EDA server and every accepted PCM/window/FFT/bin/map value.
- **12 direct PDM equivalence scenarios pass** against the frozen original
  parallel converter, including 1/30/60 microphones, one/multiple/full-parallel
  lanes, ragged lane groups, non-power-of-two decimation, multiple CIC orders,
  signed FIR coefficients, integer formats, rounding ties, clipping and CIC wrap.
- Resets during a lane sweep, on its last slot, and while output is stalled are
  checked. Output stability and input capture under processing latency are checked.
- **Four deliberately broken variants are rejected** by the existing scoreboards.
- All **90 expected-vector files across the 15 end-to-end cases are unchanged**
  from the original baseline. The current source hashes match the simulated and
  synthesized copies. All mapped leaves are recognized library cells; area sums
  reconcile with the DC report within text-output rounding.

Reports: `regression/verification.json`, `unit/summary.json`, `summary.json`, and
`synthesis_banked/dc_area.rpt` / `dc_cells.tsv` / `source_sha256.txt`.

## Reference reviewed

The linked project's [master_mic.sv](https://github.com/mhbbParsa/acoustic_camera/blob/main/FPGA/acoustic_camera.srcs/sources_1/new/master_mic.sv)
instantiates one CIC per microphone; its pin/clock-phase multiplexing does not
share the CIC arithmetic. Its [CIC.sv](https://github.com/mhbbParsa/acoustic_camera/blob/main/FPGA/acoustic_camera.srcs/sources_1/new/CIC.sv)
uses explicitly sized state and sliced output scaling. It is useful context for
compact arithmetic, but its fourth-order/pipelined filter and output conventions
differ from ours. No source code was copied; this implementation preserves our
existing third-order default and exact numerical contract.

## Files and reproduction

Production source: `rtl/full_pipeline/src/lmca_pdm_decimator.sv` and the top-level
`PDM_LANES` parameter in `lmca_pdm_camera.sv`. Configuration:
`rtl/full_pipeline/config/hardware.toml`, `[pdm] lanes = 1`.

The existing verified wrapper with the new parameter is at
`regression/baseline/lmca_configured_camera.sv`. Use production SV and this wrapper
for an RTL diagram. Original baseline snapshots remain saved separately.

From the algorithm repository, regenerate into this result directory and run
`rtl/full_pipeline/scripts/verify.py`, `negative_controls.py`, `audit.py`, and
`verify_pdm_shared.py` as documented in `rtl/full_pipeline/README.md`.
Then run this directory's `summarize.py` after collecting the mapped reports.

Final remote run: `~/workspace/lmca-pdmshared-banked-20261111` on EDA_SERVER.
The earlier shared-array measurement is retained under `synthesis/`; final area
claims use **only `synthesis_banked/`**. The mapped database is retained remotely
as `synthesis/mapped.ddc` for further timing inspection without resynthesis.
