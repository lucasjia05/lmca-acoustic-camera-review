# Area-axis extension — November 12, 2026

Sixteen new whole-top synthesis points extend the rounded-accumulator study.
Every point passed two PDM-to-map and two PDM-to-UART fixtures, with two maps per
fixture. This round checks numerical implementation, not scene/image quality.
All variable storage is counted as registers; constants and UART are included.
The core remains a shared selected-bin DFT, not a full buffered FFT.

## Measurements

| Configuration | NAND2 equivalents | Flip-flops |
|---|---:|---:|
| m30_k4_q24 | 208.4k | 15,431 |
| m30_k8_q24 | 288.1k | 23,592 |
| m30_k12_q24 | 368.1k | 31,753 |
| m24_k8_q24 | 253.6k | 20,124 |
| m30_k8_q16 | 250.2k | 19,752 |
| m30_k8_q32 | 325.3k | 27,432 |
| n256_m30_k8_q24 | 282.3k | 23,110 |
| n1024_m30_k8_q24 | 294.7k | 24,074 |
| grid6_m30_k8_q24 | 285.2k | 23,588 |
| grid1_m30_k8_q24 | 305.1k | 23,598 |
| fs96_m30_k8_q24 | 288.4k | 23,688 |
| holdout_m24_k6_q24 | 221.7k | 16,860 |
| m16_k16_q24 | 262.9k | 21,320 |
| holdout_m16_k24_q16 | 287.8k | 23,881 |
| m24_k10_q24 | 285.6k | 23,389 |
| holdout_m30_k10_q16 | 281.1k | 22,873 |
| prior16_acc42_q32 | 197.5k | 14,663 |
| prior16_acc34_q24 | 177.7k | 12,615 |
| prior16_acc26_q16 | 157.2k | 10,567 |

For the 30-mic comparison, four→eight bins adds
79.7k GE; eight→twelve adds
80.0k. Doubling N=512→1024 changes area by
+6.6k, and changing the grid from 3°→1° by
+17.0k. Reducing Q24→Q16 storage changes it by
-37.9k. The matched-duration 96k/N256/÷32 comparison
changes total area by +0.3k versus
192k/N512/÷16. Each comparison retains the other specified parameters.

Every source/table hash available locally was checked against the synthesis audit,
and simulation source/table copies match the synthesized processing blocks.
No memory macros, excluded memory bits or external memory ports were reported.
Remote full netlists and reports: `~/workspace/lmca-cost-model-20261112/area_axes/`.
Local per-point evidence: `results/hardware_cost/area_axes/`.

## Screening curves

The new model uses total GE = nonnegative fit of constant, raw spectrum bits,
microphone count, direction count and window length. Raw bits are
`2*M*K*(fractional_bits + ceil(log2(N)) + 1)`.
Training: 13 points. The three M=24 configurations, the
M=16/K=24/Q16 point and the M=30/K=10/Q16 point are excluded from fitting and used as independent checks.
Maximum held-out error:
5.92%. Engineering screening allowance:
±22.82%, no smaller than the original model's allowance.
This is not a statistical confidence interval and does not validate every corner.
The 96k/R32 point is a separate measured comparison, not part of this model.

The original generic estimator has NOT been overwritten. This new model is
restricted to its saved architecture, formats and ranges. It does not estimate
arbitrary stage widths, programmable tables, SRAM, PDM filters or parallelism.
Synthesized points are markers; lines are estimates, never additional measurements.

`configuration_screen.csv` contains 5,670 generated combinations with both
estimated intervals and actual measured totals where available. It uses FOV=60°
on each axis, Fs=192k, one window/map, CIC3/16, identity FIR, a 20 cm spiral,
and a 48-bit streamed UART map. Screening labels refer to the interval only,
not quality approval, timing closure or physical-chip fit.

## Unimplemented dimensions

Averaging/overlap figure counts incremental flip-flops only for one accumulator
bank per concurrent window and one running map sum. It omits access/control and
arithmetic. It is a lower bound for those named arrays in that assumed schedule,
not a universal minimum or a verified implementation. Finer grids become much
more expensive when a running map must be stored than when a map is streamed.

The rate comparison does not qualify antialias filtering: all configurations
still use CIC3 and identity FIR. Filter taps/order and additional precision-stage
curves need dedicated measurements. Mic geometry affects constants; no independent
geometry/quality study was performed. Production defaults remain unchanged.

Reproduce preparation with `python -m exploration.area_axes`, run generated batches
on the EDA server, retrieve the evidence, then run
`python -m exploration.area_axes_report` to audit, fit and publish.
