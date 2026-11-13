# FFT versus selected-bin DFT: measured comparison

Both architectures implement frequency-domain DAS. FFT itself does not restore frequencies if the same sparse bins are discarded afterward. The FFT candidates below retain every in-band bin at their respective window lengths.

## Four FFT candidates

| Mics | N | In-band bins | FFT working precision | Observation | Measured GE |
|---:|---:|---:|---|---:|---:|
| 16 | 64 | 7 | 18/Q16 | 0.333 ms | 282,252 |
| 8 | 128 | 13 | 18/Q16 | 0.667 ms | 265,477 |
| 16 | 64 | 7 | 16/Q14 | 0.333 ms | 262,533 |
| 12 | 64 | 7 | 24/Q22 | 0.333 ms | 281,124 |

All use 192 ksample/s, 20–40 kHz, 20 cm spiral, 60° FOV on both axes, 3° grid, CIC3/16 with identity FIR, PCM16/Q15, window18/Q16, coefficient18/Q16, spectrum24/Q22 and 48-bit UART map output. There is one window per hardware map. All registers and UART are included.

## What changed in hardware

Two real microphones are packed into one complex radix-2 FFT. A single scalar read/write port accesses an in-place frame array. One complex multiplier is shared by FFT butterflies and DAS. Each stage scales by one half with ties-to-even rounding. Conjugate symmetry separates each microphone spectrum before steering. No separate selected-spectrum or map-frame RAM is hidden outside the gate total.

The working frame has M*N*FFT_width bits. Unlike the DFT accumulator architecture, retaining more DAS bins does not enlarge this frame. Reducing N is the strongest storage lever. With 30 microphones, N512 and FFT width18, the frame alone is 276,480 bits or 1,175,040 NAND2 equivalents of flip-flops; access logic and the rest of the chip add more. This is a lower bound for this architecture, not proof that every possible FFT architecture needs that area.

## Interpretation

- The 16-mic/N64/18-bit candidate preserves more spatial samples while retaining contiguous spectral bins. It is the starting FFT baseline, not a universal winner.
- The 8-mic/N128/18-bit candidate doubles observation duration and halves bin spacing, but sacrifices spatial sampling. Compare weak/multiple sources and mismatch scenes.
- The 16-mic/N64/16-bit candidate isolates precision savings; weak-output rounding is a real cost, including some pulse trials.
- The 12-mic/N64/24-bit candidate spends fewer microphones on finer numerical precision. It is useful for identifying whether precision or spatial sampling is limiting a scene.
- All FFT candidates observe much less time than the N512 DFT candidates. At N64, bin centers are 3 kHz apart; at N128, 1.5 kHz. Contiguous bins remove deliberate gaps, but coarse frequency resolution can degrade phase-steering approximation across a bin.
- More FFT bins are comparatively cheap in area but add DAS cycles. Longer FFT windows are expensive because every microphone frame grows. Finer angular grids chiefly add constants and computation; they do not remove array resolution limits.
- Frequency sweep results isolate sparse-bin retention before steering. They show why normalized localization maps alone were insufficient for selecting a design.
- The matched N128/16-mic/all-13-bin control measured 220,914 GE for DFT versus 464,456 GE for FFT. Both retain contiguous in-band bins. The DFT raw accumulator is 32/Q24; FFT working storage is 18/Q16; both deliver 24/Q22 spectra. Inspect figure 25 before attributing full coverage exclusively to FFT.
- Multiwindow averaging appears only as a software control. Its storage/scheduling is not included in these measured candidates.

## Parameter tradeoffs

| Parameter group | Selected-bin DFT | Shared FFT |
|---|---|---|
| Microphone count | More accumulator storage; improves spatial sampling | More full-frame storage; improves spatial sampling |
| Retained bins / frequency band | Strong area and compute cost; sparse bins can lose tones | Small incremental area in this design; DAS work still grows; retain contiguous bins when possible |
| Window length / sampling rate | Longer N adds little accumulator storage | Longer N enlarges every microphone frame; lowering Fs changes duration and frequency spacing at fixed N |
| Numerical precision | Accumulator fraction controls rounding and stored size | Working width controls frame size and rounding at every butterfly; the widths are not interchangeable |
| FOV / angular grid | Modest storage cost for streamed maps; more DAS cycles | Same basic coupling; physical angular resolving power remains array-limited |
| Averaging / overlap | Extra scheduling and storage not implemented | Extra scheduling and storage not implemented; software-only averaging control is not a near-budget hardware design |
| Other stage widths / input filters | Prior measured or rough analytical evidence remains applicable to common blocks | Held fixed here; no new gate calibration for these changes |

Layout and source distance/noise affect the scene and coefficients; they do not independently set the number of stored FFT samples. Update rate is an outcome, not an independent area knob.

## Model and verification

17 FFT whole-top measurements and two new matched DFT controls. Fit: 12 training points; 5 withheld checks; maximum withheld error 5.12%. Screening allowance ±25.0%, not a statistical confidence interval.

Run `python -m exploration.fft_area_estimator --config config/fft_area_estimator.json`. Inputs group microphone count, window length, FFT working width, retained bins, rate/band and FOV/grid. The model reports its full-frame register floor. Rate/band/FOV outside calibration are flagged; other-stage precision, filters, SRAM, parallelism and averaging are not calibrated. The original DFT estimator remains separate.

The fitted feature equation is `GE = a + b*(M*N*FFT_width) + c*M + d*directions + e*N + f*selected_bins`. Coefficients in that order are: `52968.7, 9.63271, 3055.6, 8.77422, 32.013, 54.4098`. Exact measured settings return their measured count instead. These are empirical whole-top coefficients, not individual cell prices.

Bin-count and direction-count slopes come from matched controlled sweeps. The remaining terms are fitted after subtracting those effects, so larger memory/addressing residuals do not masquerade as expensive extra bins. The fine-grid held-out point tests extrapolation beyond the two coarser calibration grids.

The existing DFT model, without refitting, predicted the two new N128 controls within 0.17%. These are useful out-of-range validation points; they do not qualify every shorter-window/precision combination or silently change the older model’s declared scope.

The N256/16-mic/18-bit full synthesis was omitted because its frame flip-flops alone require 313,344 GE, before access logic and all other blocks. Larger-window model predictions are flagged as extrapolations outside the measured range. Additional 30-mic FFT synthesis was cancelled at the user’s request; no incomplete result is treated as a measurement.

Every measured design passed two independent PDM fixtures, two maps per fixture, with exact PCM, window, complete packed FFT storage, unpacked selected spectrum, steering, map and UART checks. Simulation sources are checked against synthesis hashes; inferred frame memory is exactly one scalar read/write port and all arrays are mapped to registers. Independent NumPy FFT checks cover DC, impulse, Nyquist and random/full-scale inputs across N64–1024 and widths16/18/24.

The scene comparison contains 1377 maps across 17 scene recipes and three seeds. Its equal-coverage controls compare FFT and DFT at identical M/N/bins. A separate 401-frequency sweep examines sparse-bin retention, with three tone phases; additional weak-level spectrum tests examine butterfly rounding.

An additional 5832-map spatial sweep tests 81 tone frequencies, two on-grid directions, three phases and quiet/10 dB input-SNR conditions. Figure 26 reports strongest-pixel pointing within 2.2°, not detection probability. It exposes narrowband aliases and coarse-bin steering separately from the two original test tones.

These checks do not establish clock closure, sustained real-microphone capture, anti-alias filter suitability, physical routing/scan/pad overhead, power, acoustic calibration or real-drone PD detection. The input remains a backpressured PDM test stream. A number below 300k is the synthesized functional logic total, not a completed chip.

## Reading the plots

Figures 19 and 20 share the same recordings and long reference; figures 21 and 22 do likewise for stress cases. Each image is independently normalized to −12…0 dB; peak-power labels expose the absolute change. Figure 23 isolates architecture with matched parameters. Figure 24 pools three seeds. The recordings were regenerated together for all microphone layouts, so old seed-specific counts are not identical trials.

Artifacts remain local in the review handoff; this script does not publish the GitHub page.
