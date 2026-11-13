# Gate estimate — November 11, 2026

**Approximately 340,000 NAND2-equivalent gates for compute/control logic,
plus 293 KiB of RAM and 3.81 MiB of ROM.** This is the current untuned functional
baseline, not a minimum hardware cost for frequency-domain DAS.

Configuration: 30 microphones, 512-point FFT, 67 selected bins, 441 directions,
4096-sample observation, 2048-sample map hop, 15 FFT frames per map, PDM /16 CIC3.
All RTL and coefficient hashes match the previously verified full-pipeline baseline.

| Quantity | Result |
|---|---:|
| Standard cells, excluding logical constant drivers | 203,652 |
| Of those, flip-flops | 9,390 |
| NAND2 equivalents, Liberty-area normalization | 340,737 |
| NAND2 equivalents, LEF-footprint normalization | 338,015 |
| Logic cell area, Liberty | 639,632 µm² |
| Logic cell area, summed LEF footprints | 634,522 µm² |
| Separately inferred RAM | 2,402,838 bits = 293.315 KiB |
| Separately inferred ROM | 31,928,680 bits = 3.806 MiB |

Gate equivalent = mapped cell-area sum / area of one NAND2X1. Both NAND2 references
are 1.8772 µm². The library has some Liberty/LEF inconsistencies, hence both results.
The logic total includes registers and smaller tables that were mapped to cells;
large memories are excluded and must not be counted as already included.

If the separately counted RAM were built from standard-cell DFFPOSX1 flip-flops,
its **storage bits alone** would add approximately **10.21 million NAND2 equivalents**
(4.25 equivalents per bit). Together with the mapped logic that is at least
**10.55 million equivalents**, before RAM enables/read muxes/decoders and before
any implementation of the large ROM tables. This is a storage implementation
illustration, not the result of a complete all-flip-flop synthesis run. SRAM/ROM
macro area cannot be quoted until actual macros are selected; some inferred arrays
require multiple read/write ports.

The 240 KiB observation buffer dominates working storage. Steering weights alone
account for 31,910,760 ROM bits. `memories.json` lists all separately counted arrays.

## Method and checks

1. Yosys 0.25+3 inferred and optimized memories from the actual generated baseline.
2. Arrays ≥4096 bits were exposed as explicit memory-interface ports in a separate
   synthesis-only logic shell. Smaller memories remained in the logic to be mapped.
   Memory read outputs remain live primary inputs; write/address/control signals
   remain observable outputs. They were not replaced by constants.
3. Design Compiler R-2020.09-SP4 mapped the logic shell to the installed educational
   `gscl45nm` library, excluding the seven previously identified zero-max-capacitance
   cells. Mapping used a relaxed 100 ns clock and medium map effort.
4. Every counted leaf cell is a known standard cell. The 699 logical constant-driver
   pseudo-cells have no area and are reported separately. Summed cell areas match
   the Design Compiler area total (within report rounding).
5. Input RTL/coefficient fingerprints match the verified baseline exactly. No
   functional RTL changes were made for this estimate.

`dc_check.rpt` warnings concern constant/unused DesignWare ports, feedthroughs,
aliased memory-interface pins and unused high arithmetic bits. These are not a
claim of post-layout or gate-simulation qualification. There was no full mapped
memory implementation, placement, routing, clock tree, or target-65-nm signoff.
Timing in the artificial memory-port shell is not the full accelerator's timing.

The initial Yosys technology-mapping attempt exceeded its 6 GiB process limit.
The completed count comes from Design Compiler, not that aborted attempt.

## Evidence and reproduction

- `summary.json`: totals, per-cell counts, assumptions and memory inventory.
- `dc_area.rpt`, `dc_cells.tsv`, `dc_references.rpt`: completed cell mapping.
- `dc_mapped.v`: mapped **logic shell**, not a drop-in full accelerator netlist.
- `source_sha256.txt`: source and coefficient fingerprints.
- `infer.ys`, `memopt.ys`, `extract_logic.py`, `shell.ys`, `dc.tcl`,
  `summarize_dc.py`: the successful measurement flow.

Remote working directory: `~/workspace/lmca-gates-20261111` on EDA_SERVER.
With the baseline sources/ROM files and qualified library audit in that directory:

```sh
export PATH=/ece/oss-cad-suite/bin:$PATH
yosys -T -s infer.ys
yosys -T -s memopt.ys
python3 extract_logic.py
yosys -T -s shell.ys
export SNPSLMD_LICENSE_FILE=1781@LICENSE_SERVER
/ece/synopsys/syn/R-2020.09-SP4/bin/dc_shell -no_gui -f dc.tcl
python3 summarize_dc.py
```
