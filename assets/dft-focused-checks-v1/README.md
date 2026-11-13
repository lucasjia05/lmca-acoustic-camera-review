# Frequency gaps and weak-pulse maps: site handoff

Two new controlled comparisons for the preferred 30-microphone / 10-bin / 26-bit-accumulator DFT design. These are new PCM-stage experiments, not screenshots from the earlier gallery. No website changes made.

## Figure 1: frequency-maps.png

Left: actual candidate. Right: same 30 microphones, N512, 26-bit accumulator, but all 53 in-band bins retained. This software control is not claimed to fit 300k gates. Both use 192 ksample/s, 20 cm spiral, 60-degree FOV, 3-degree grid, sqrt-Hann and identical source recordings per comparison.

Rows: 28.875 kHz quiet; 30 kHz quiet; 28.875 kHz plus noise; 30 kHz plus noise. 28.875 kHz is a retained center; 30 kHz lies halfway between the retained 28.875/31.125 kHz centers. Source RMS is -26 dBFS. Noise is independent, broadband white microphone noise at -26 dBFS RMS: nominal 0 dB TOTAL input SNR, not band-limited SNR or measured drone noise. Same random realization reused across frequencies.

Cyan ring = true source (-12, +6 degrees); white plus = brightest pixel. Each map independently normalized to -12...0 dB, as in the earlier gallery. Seed 7 was fixed as the displayed seed before evaluation; seeds 23 and 91 are also saved. The source is on the scan grid, so zero error is expected in favorable conditions; this is not general angular-accuracy evidence.

Result: quiet maps point correctly even in the gap. With noise, the selected-bin center still points correctly, while the gap case points to clutter (17.5, 21.2 and 22.5 degrees error across the three seeds). The all-bin control points correctly in these same cases. This illustrates a concrete visible consequence of frequency gaps, not merely lower absolute brightness. It is a controlled failure example, not a detection-rate estimate across sources/frequencies/noise.

## Figure 2: weak-maps.png

Left: 26-bit accumulator (16 fractional bits). Right: 34-bit accumulator (24 fractional bits), identical 30 microphones and ten bins. This is a software precision control; no new synthesis performed. Same 16-bit PCM input, 24-bit spectra and 48-bit map output in both.

Rows: broadband burst peak levels -30, -50, -65 and -80 dBFS. A sum of all 53 in-band tones with seeded random phases is multiplied by a Gaussian envelope of 80 microseconds standard deviation, centered in the 512-sample window. Peak level is normalized across the generated microphone sample matrix. Quiet, one source at (-12, +6 degrees), no added noise. These levels are digital amplitudes, not SPL, range or the sensitivity of the proposed microphone.

Result: BOTH precisions point correctly at the first three levels for all three seeds. At -80 dBFS, BOTH produce all-zero maps. Therefore this example does NOT show the 26-bit accumulator is inadequate or that 34 bits solves weak-event loss. Shared quantization stages can still erase events; this test does not isolate which stage dominates. More weak/noisy/misaligned pulse cases would be needed for an operational sensitivity claim.

## Publishing guidance

Keep the control labels and normalization explanation. Do not label the all-bin control as a feasible 300k implementation. Do not label the weak-event plot as evidence against 26-bit accumulators. No actual camera photo is overlaid: these are the intensity layers that would be overlaid on camera imagery.

Artifacts: PNG figures, maps.npz, measurements.json (48 maps), configuration.json and this note. Reproduce from the algorithm repository with `python -m exploration.map_failure_examples`. Source: exploration/map_failure_examples.py. All 48 runs completed without clipping. Production defaults unchanged.
