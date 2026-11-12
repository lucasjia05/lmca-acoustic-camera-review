# Precision investigation and parameter coverage — November 12, 2026

## What this investigation added

19 precision variants × 77 input cases = 1,463 integer-model maps. Six existing
synthetic scenes (unequal sources, independent noise, pulses and tones at 22.5,
30 and 45 kHz), three seeds each, at four digital levels. Five additional controls:
silence, positive/negative full scale, full-range random PCM and noise only.
All variants use identical PCM16 inputs, 16 microphones, eight selected bins over
20–40 kHz, N=512, a 20 cm spiral and ±30° FOV on a 3° grid. Each map uses one window.
The four levels have input peaks of −6, −26, −46 and −66 dBFS, NOT calibrated SPL.

The new integer model reproduced all map values and Fourier coefficients of the
existing baseline oracle before the sweep. It rounds each Fourier contribution
before accumulation when reducing stored fractional precision and checks every
prefix sum. An independent absolute-sum bound proves sufficient accumulator width
for **any PCM16 stream with these fixed tables**, including adversarial full-scale
inputs. The bound must be recomputed for other window/FFT/precision parameters.

## Measured RTL and area

The original complete circuit is 206,730 NAND2 equivalents,
using 46-bit accumulators with 32 fractional bits. Each candidate below passed
baseline, noisy and random PDM-to-map and PDM-to-UART simulations (two maps per
fixture, every output checked). These are isolated experiments under results;
production defaults have not changed.

| Accumulator candidate | Complete GE | Saved GE | Worst map error* | Peak / source-match changes |
|---|---:|---:|---:|---:|
| acc42_q32 | 197,462 | 9,268 | 0.00% | 0 / 0 |
| acc34_q24 | 177,717 | 29,013 | 1.61% | 0 / 0 |
| acc26_q16 | 157,178 | 49,552 | 33.33% | 0 / 0 |

*Maximum absolute pixel error divided by the original wide map's maximum, across
all 77 cases with a nonzero reference. Errors near the output quantization floor
can be a large percentage of a tiny number. Zero-reference maps are excluded from
relative-error statistics; at −66 dBFS nine of the 18 scene references already
produce all-zero maps. Matching a zero reference is NOT evidence of sensitivity.
Source matches are diagnostic peaks within 2.2°, not a PD detection probability.

42/Q32 removes only redundant integer headroom, so numerical outputs are exactly
unchanged under the proved bound. 34/Q24 and 26/Q16 also discard fractional detail.
34/Q24 is the more conservative next candidate; 26/Q16 merits additional weak-signal
tests before adoption. These area results include all registers, table logic and
UART; no SRAM or external storage is omitted. They are gscl45nm synthesis estimates,
not physical fit, timing closure or power measurements.

## Other precision findings

- Fourier storage: fractional settings 32, 24, 20, 16, 12 and 8 were screened.
  Aggressive Q12/Q8 settings changed diagnostic results; Q8 can erase weak maps.
- Windowed samples: 18/Q16, 16/Q14 and 12/Q10. The 12/Q10 setting lost weak maps.
- Coefficients: 18/Q16, 16/Q14 and 12/Q10. No peak/source-match changes in this pilot,
  but power changes increase near the floor. These have not been synthesized
  independently at this configuration.
- Normalized spectrum: 24/Q22, 20/Q18 and 18/Q16. Some weak-case peak/source-match
  changes occurred. Reducing this width does not automatically reduce raw storage.
- Power output: removing integer headroom (48→44 or 40 bits, keeping Q32) gave
  identical results in these cases; unlike the Fourier bound, this does not prove
  all possible power inputs safe. Reducing fractional precision to Q24/Q16 erased
  weak outputs. Do not treat all ways of cutting eight bits as equivalent.
- Phase table: 512, 1024 and 2048 phase positions screened; no peak/source-match
  changes here. Area and a larger directional/source-separation sweep remain open.
- PCM precision, CIC internal widths, DAS sum guard bits and combinations of
  stage reductions were NOT independently swept in this investigation.

## Parameter coverage inventory

“Measured area” means complete compact-architecture synthesis points, not the old
full-FFT logic-only estimate. A mixed held-out point does not isolate each parameter.

| Parameter | Evidence already available | Still needed |
|---|---|---|
| Microphone count | Area: 16/24/30/36/48 (24/36 in mixed checks). Recent matched-field quality: 16/24/30. | Joint count/layout/bin/precision quality tradeoff; placement tolerances. |
| Selected-bin count | Area: 4/8/12, plus 5/6 in mixed checks. Python: sparse counts versus 53/67-bin references. | Bin placement and coverage strategies, especially tones between selected bins; joint area/quality sweep. |
| Frequency band | Python 25–50 versus 20–40 kHz; one independent 20–40 synthesis check plus current precision points. | Field recordings, microphone response and drone/PD spectra; band not settled. |
| FFT/window length | N=256/512 area points; recent image tradeoffs mainly N=512. | Matched-recording quality and latency sweep at fixed observation duration and band coverage. |
| Scan spacing | Area: 3°/6°, plus 4°/5° mixed checks; separate fine-grid scene diagnostics exist. | Systematic spacing versus localization/weak-source quality; distinguish scan spacing from acoustic resolution. |
| FOV | Recent compact studies fixed at ±30° = 60° total per axis. | Edge-of-FOV and outside-FOV interference; area/latency sweep with grid spacing controlled. |
| Precision | Previously one bundled narrow synthesis and a mixed 20-bit-spectrum check; current stage sweep and three accumulator syntheses. | PCM/CIC/DAS guards; combined changes; expected signal dynamic range; calibrate area across M/K. |
| Observation/averaging | Python one window, eight nonoverlap windows and 15 half-overlap windows. | Implement and measure compact RTL averaging/overlap; current area additions are analytical. |
| Sampling rate | 192 ksample/s fixed in recent cost/quality studies. | Anti-aliasing and PDM-decimation response; throughput and hardware/quality tradeoff. |
| Array layout/aperture | Recent cost/quality uses a 20 cm spiral, native layouts per microphone count. | Layout/aperture sweep with comparable cost and scene conditions. |
| Range / near-field focus | Scene tests can vary source distance; compact RTL uses far-field steering. | Air attenuation, source strength, real microphone sensitivity and near-field mismatch; no validated detection-range claim. |
| PDM filter / sharing | Parallel versus shared implementation measured; several functional lane/decimation/FIR cases verified. | CIC bit pruning, filter response/compensation, microphone clock compatibility and continuous capture. |
| UART | Complete TX implementation and end-to-end simulation; one primary area/baud configuration. | Required output precision, baud/host handling and uninterrupted acquisition. |
| Noise reduction / calibration | Scene robustness tests exist. | Algorithm additions, mic mismatch compensation and real drone recordings; corresponding RTL cost. |
| SRAM / shared FFT alternative | Capacity/planning calculations. | Implemented scheduling and measured macro/periphery cost; not a calibrated total-area model. |

## Recommended next investigation

1. Use 34/Q24 as a promising candidate, retaining the 46-bit reference for comparison.
   Combine it with modest coefficient/window reductions only after checking their
   interaction. Preserve enough fractional power resolution for weak signals.
2. Spend the recovered budget on **frequency coverage and observation duration**
   experiments: those already showed more consequential signal losses than the
   conservative precision reductions. Test bin placement, not only bin count.
3. Then jointly tune mic count/layout, FFT length and scan spacing against that
   quality baseline. Sampling/filter qualification and continuous capture must be
   resolved before an achieved maps/s or physical-chip fit claim.

The existing generic gate estimator remains calibrated to its original width
formula. The new measurements are separate evidence; it does not yet estimate
arbitrary accumulator fractions or independent precision combinations reliably.

Reproduce with `python -m exploration.precision_study` and
`python -m exploration.prepare_precision_rtl`; run each generated candidate's
`run.sh` on the EDA server, retrieve evidence, then
`python -m exploration.report_precision_study`.
