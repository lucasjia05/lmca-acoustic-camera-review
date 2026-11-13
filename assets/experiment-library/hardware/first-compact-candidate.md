# Register-only candidate — November 11, 2026

**234,590 NAND2-equivalent gates, with all storage included.**
No SRAM macros, off-chip memory, extracted memory ports, or separately budgeted
register banks are required by the measured processing top. The 18,205 flip-flops
are already included in that count. Constants are synthesized into logic.

| Block | NAND2-equivalent gates | Flip-flops |
|---|---:|---:|
| Window, selected-bin DFT, phase generation, DAS and map power | 165,647.25 | 11,372 |
| Shared-lane PDM-to-PCM | 62,794.00 | 6,288 |
| PCM serialization | 5,860.00 | 513 |
| Interface checks | 288.75 | 32 |
| **Total** | **234,590.00** | **18,205** |

The complete circuit contains 128,838 standard cells. Gate equivalents use the
gscl45nm Liberty NAND2 area, 1.8772. Summing leaf-cell areas reproduces the Design
Compiler area report. The library's LEF geometry gives a different normalization,
222,808.75 gate equivalents; use the conservative 234,590 value consistently with
the previous reports. No black boxes or memory macros remain.

## What changed

| Parameter | Previous full pipeline | This candidate |
|---|---|---|
| Microphones | 30 | 30 |
| Aperture | 20 cm spiral | 20 cm spiral |
| PCM sampling rate | 192 ksample/s | 192 ksample/s |
| Angular scan | ±30° on both axes, 3° step, 441 points | Same |
| Fourier window | 512 samples | 512 samples |
| Selected frequency bins | 67 | 4: 25.125, 33.375, 41.625, 49.875 kHz |
| Observation | 4096 samples; 15 overlapping frames | 512 samples; one window |
| Frequency transform | Buffered full FFT | Streaming selected-bin DFT |
| Steering coefficients | Large precomputed table | Geometry arithmetic and quarter-wave trig logic |
| Map storage | Full map buffer | Stream each completed map point |

This keeps the angular sampling grid, not a guarantee of unchanged acoustic
resolution or sensitivity. Four bins can miss energy elsewhere in the band.
The single 2.67 ms window has less averaging gain than the previous observation.
No application-quality equivalence to the old settings is claimed.

The earlier approximately 195k shared-PDM estimate excluded large RAM and ROM
arrays. It cannot be compared directly with this fully accounted 234,590-gate total.

## Evidence

- `synthesis/summary.json`: complete leaf-cell accounting, per-block counts,
  zero excluded memory, port audit and source/constant hashes.
- `synthesis/dc_area.rpt`, `dc_cells.tsv`, `mapped.v`: area report, cell inventory
  and the actual synthesized circuit.
- `verification_summary.json`: checks of saved functional results and source hashes.
- Each case directory contains the generated configuration, Python expectations,
  simulation log and every actual output map point.
- `negative_controls.json`: four deliberately broken designs rejected by scoreboards.
- `synthesis/gate_*.log` and `gate_*_maps.hex`: zero-delay netlist checks against
  Python expectations, using cell functions generated from the gscl45nm Liberty file.

The RTL suite covers 14 cases, with two complete maps per case: full-size quiet,
noisy and random scenes; small source, silence, positive/negative DC, ragged lane
count with a nontrivial FIR, four reset-interruption stages, reduced precision with
Hann window, and forced window clipping. Output backpressure and input gaps are
exercised. Stage checks include PCM, windowing, all retained DFT coefficients, every
steering phase and every output value. Deliberate PDM polarity, DFT sign, steering
sign and input-handshake faults must fail.

For the full-size source and noisy fixtures, the floating-point comparison differs
by at most approximately 0.0142% of the float map's peak; both implementations locate
the source at (15°, 0°). These fixtures deliberately contain energy at the four
selected frequencies. The random noise-only tests agree to below 0.15% of peak but
do not represent a source-detection success. Near-silence relative errors can be
large because the denominator is tiny. Forced clipping intentionally damages the
image and is checked for correct numerical behavior and flags, not image quality.

## Boundaries

This is a functional batch prototype. Real microphone clocking and continuous
capture are not yet implemented/qualified: the input test stream honors backpressure.
The result does not establish a real-time clock, map rate, power, target-process
layout fit or drone discharge-detection performance. Synthesis used a relaxed
100 ns constraint and no physical implementation. Clock tree, scan and pad cells
are not included; the 65,410-gate gap below 300k is preliminary headroom.

Configuration is in `rtl/compact_pipeline/config.toml`; implementation and reproducible
steps are described in `rtl/compact_pipeline/README.md`. These parameters and tables
are already fixed during synthesis. Changing them requires regeneration and another
verification/area measurement; hardcoding them again is not a separate free saving.
