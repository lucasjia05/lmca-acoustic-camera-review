# Constrained acoustic camera algorithms — first pilot

We can test the compromises directly in Python while the RTL is being reduced. This run compares **360 maps on 18 shared synthetic recordings**: six scenes, three seeds, multiple floating-point controls, four compact arithmetic profiles and three absolute input levels. These comparisons do not represent 360 independent acoustic trials.

## What the first tests show

- **Sparse bins are the main risk for narrowband signals.** With 30 microphones and four fixed bins, a 22.5 kHz tone loses about 45 dB of raw peak map power versus the dense reference and its peak is misplaced. A 30 kHz tone loses about 50 dB; the eight-bin version loses about 34 dB. Both tones are inside the stated 20–40 kHz band. A sparse selection does not provide uniform sensitivity throughout that band.
- **One short window loses temporal coverage.** For the burst examples, using all 53 bins in only the first 512 samples still loses about 32–39 dB versus the longer observation. More bins alone cannot recover an event outside the short capture. This tests one capture alignment; it does not establish a burst-miss probability or a continuous 5 maps/s schedule.
- **Wide arithmetic behaves well when there is enough retained energy.** For the steady broadband and noisy broadband scenes, its maximum pointwise error is below 0.15% of the same sparse floating-point map's peak. The 16-bit bundle raises that error to roughly 0.8–2.4% in those scenes, and can erase weaker off-bin or burst maps entirely.
- **A normalized heatmap can conceal a failure.** The 30 kHz tone still looks localized in some sparse maps after roughly 50 dB of energy has been discarded. We record absolute power, zero maps and off-target peaks as well as location.

Raw power differences are **not equivalent to SNR or range losses**. The beamformer sums powers over bins: four bins naturally collect less broadband energy than 53 (about 11.2 dB for an ideal flat spectrum). Recalibrating the display can correct that scale, but cannot restore rejected tones, averaging stability or event coverage.

## Settings

All variants use 192 ksample/s PCM, a 20 cm spiral aperture, far-field steering, a square-root-Hann window, 60° span on **each** scan axis (±30° azimuth/elevation), and a 3° grid with 441 directions. The source spectrum is independent of the retained bins. Native 16- and 30-microphone spirals sample the same generated sound field.

| Version | Mics | Selected frequencies | Observation | Arithmetic |
|---|---:|---|---|---|
| Dense reference | 30 or 16 | All 53 bins, 20.25–39.75 kHz | 4096 samples; 15 overlapping windows | Float |
| Compact 30 | 30 | 20.25, 26.625, 33.375, 39.75 kHz | 512 samples; 1 window (2.67 ms) | Wide or narrow |
| Compact 16 | 16 | 20.25, 22.875, 25.875, 28.5, 31.5, 34.125, 37.125, 39.75 kHz | 512 samples; 1 window | Wide or narrow |

Wide uses window18/Q16, spectrum24/Q22, coefficient18/Q16 and power48/Q32. Narrow uses 16/Q14 for window, spectrum and coefficients, and power48/Q28. Both quantize input PCM to 16/Q15 and steering to 1024 phase positions. Separate floating-point controls change only the bin selection or only the observation length.

The input-level sweep applies 0, 20 and 40 dB additional attenuation to **both source and noise**. It isolates arithmetic floors with unchanged acoustic SNR and no gain adjustment. It is not a microphone sensitivity specification. The 45 kHz scene is intentionally outside the new band and is excluded from the zero-map counts in the chart.

## Area context

| Compact profile | Estimated gates, UART included | Screening interval |
|---|---:|---:|
| 30 mics / 4 bins / wide | 239k | 184–293k |
| 30 mics / 4 bins / narrow | 219k | 169–269k |
| 16 mics / 8 bins / wide | 211k | 163–259k |
| 16 mics / 8 bins / narrow | 191k | 147–235k |

These are the existing synthesis-calibrated model's estimates. The separate saved 16-mic/eight-bin, 20–40 kHz circuit including UART was actually mapped at **206,730 NAND2 equivalents**, with all storage included. Those measurements use the educational gscl45nm library and are pre-layout; they do not establish fit in the target 65 nm process, achieved clock, or continuous map rate. The dense reference and extra averaging controls are quality references, not asserted 300k-gate implementations.

## Verification and boundaries

The integer kernel follows the current compact RTL oracle's rounding, saturation, DFT accumulation, coefficient/phase quantization and map normalization. Before the pilot it reproduced **every value of two saved full-size RTL simulation maps: 882 exact matches**. The study starts at PCM and bypasses the PDM decimator; the input spectra used here do not include its response. It also does not simulate live capture scheduling, UART stalls, drone noise, room reflections, calibrated microphone response or real discharge signals.

The 2.2° peak-matching tolerance and 3° scan grid are diagnostic choices, not a measured angular-resolution claim. Three seeds support an initial comparison, not a detection-rate claim. Tiny leakage maps can still produce apparent peaks; all-zero maps are explicitly marked and excluded from peak matching.

## Next useful experiments

1. Sweep tone frequency across the entire 20–40 kHz band to expose sensitivity holes, and compare uniform bins with staggered selections across successive maps.
2. Sweep burst arrival time and SNR under a realistic 5 maps/s acquisition schedule. Test whether keeping more observation time is worth more than retaining more bins.
3. Sweep fractional formats and gain together before accepting narrower arithmetic. Compare false peaks and weak-source recovery against absolute thresholds.
4. Repeat the promising configurations on recorded microphone data, then give only those configurations back to the RTL work for measured area and timing.

Source hashes and every measurement are in [results.json](results.json); [measurements.csv](measurements.csv) contains the measurements in tabular form. The images show a representative seed; the measurements cover all three seeds.
