#!/usr/bin/env bash
# Turns the raw recordings in public/assets/audio into the small, game-ready files in
# public/assets/audio/ocean, used by Ocean Sounds mode (src/scenes/OceanSounds.js). Needs ffmpeg.
# Run from the repo root: bash scripts/build-ocean-sounds.sh
set -euo pipefail

SRC=public/assets/audio
OUT=$SRC/ocean
REEF="$SRC/Ambient Music or Reef Sounds/Actual Reef Sounds"
PACK=$SRC/shellfegio_sample_pack
TRIGGER="$SRC/Sound Effects/Actual Trigger Fish Sounds"
WAVES="$SRC/Main Title and Options/253607__floating-tree__waves_washingthroughcoral.wav"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

# Both reefs get the same gain, so the real difference in level between them is kept.
# The rumble below ~100 Hz (water moving past the hydrophone) is about 40 dB louder than the reef itself, so it's filtered out.
REEF_FILTER="highpass=f=150,highpass=f=150,highpass=f=150,volume=24dB,alimiter=limit=0.7:attack=1:release=30:level=0"
LOOP_LENGTH=92
LOOP_FADE=6

# Fades the end of the clip into its own start, so it loops with no audible seam. Ogg loops gaplessly; the mp3 is for Safari.
make_loop() { # input, output name, start second, filter, loop length, channels
    local start=$3 length=$5
    ffmpeg -nostdin -v error -y -ss "$start" -t "$length" -i "$1" -af "$4" -ac "$6" -c:a pcm_f32le "$TMP/clip.wav"
    ffmpeg -nostdin -v error -y -ss "$LOOP_FADE" -i "$TMP/clip.wav" -t "$LOOP_FADE" -i "$TMP/clip.wav" \
        -filter_complex "[0:a][1:a]acrossfade=d=$LOOP_FADE:c1=qsin:c2=qsin" -c:a pcm_f32le "$TMP/loop.wav"
    ffmpeg -nostdin -v error -y -i "$TMP/loop.wav" -c:a libvorbis -q:a 3 "$OUT/$2.ogg"
    ffmpeg -nostdin -v error -y -i "$TMP/loop.wav" -c:a libmp3lame -q:a 5 "$OUT/$2.mp3"
    # ffmpeg can write an empty file without reporting an error
    [ "$(stat -c %s "$OUT/$2.ogg")" -gt 100000 ] || { echo "$2 came out empty" >&2; exit 1; }
}

mean_volume() {
    ffmpeg -nostdin -hide_banner -i "$1" -af volumedetect -f null - 2>&1 | sed -n 's/.*mean_volume: \(-\?[0-9.]*\) dB/\1/p'
}

# Cuts one call out of a recording, keeping only its band, and evens out how loud the calls are against each other.
make_call() { # input, output name, start, end, high-pass Hz, low-pass Hz, target mean dB
    local hp="highpass=f=$5,highpass=f=$5" lp="lowpass=f=$6,lowpass=f=$6"
    local length fade
    length=$(awk "BEGIN{print $4-$3}")
    fade=$(awk "BEGIN{f=$length/5; print (f>0.4)?0.4:f}")
    ffmpeg -nostdin -v error -y -ss "$3" -t "$length" -i "$1" -af "pan=mono|c0=c0,$hp,$lp" -c:a pcm_f32le "$TMP/call.wav"
    local gain
    gain=$(awk "BEGIN{print $7-($(mean_volume "$TMP/call.wav"))}")
    ffmpeg -nostdin -v error -y -i "$TMP/call.wav" \
        -af "volume=${gain}dB,alimiter=limit=0.7:attack=1:release=30:level=0,afade=t=in:d=$fade,afade=t=out:st=$(awk "BEGIN{print $length-$fade}"):d=$fade" \
        -c:a libmp3lame -q:a 5 "$OUT/$2.mp3"
}

make_loop "$REEF/myora_01.WAV" reef_healthy 0 "$REEF_FILTER" $LOOP_LENGTH 1
make_loop "$REEF/goat_01.WAV" reef_degraded 30 "$REEF_FILTER" $LOOP_LENGTH 1
# Waves as heard from below the surface: only their low end carries down through the water
make_loop "$WAVES" surface_waves 0 "highpass=f=50,lowpass=f=700,lowpass=f=700,volume=14dB" 38 2

# Each clip starts just after the click at the start of the sample. 08_pop_pop is left out: its file header is damaged
# (it claims 3 channels at 1 kHz), and the reef recordings already carry real snapping shrimp. So is 12_shrimp_fish, for the same reason.
make_call "$PACK/shellfegio_01_big_whoop.wav"    whale_whoop   0.30 4.00 150 2500 -24
make_call "$PACK/shellfegio_02_duck_call.wav"    fish_duck     0.20 5.20 300 7000 -26
make_call "$PACK/shellfegio_03_falling_tone.wav" fish_falling  0.20 4.80 200 3000 -26
make_call "$PACK/shellfegio_04_flutey.wav"       fish_flutey   0.20 4.80 200 3000 -26
make_call "$PACK/shellfegio_05_good_purrs.wav"   fish_purrs    0.10 9.90 120 2500 -26
make_call "$PACK/shellfegio_06_low_tone.wav"     fish_low      0.20 4.80 200 3000 -26
make_call "$PACK/shellfegio_07_ooo_and_woop.wav" fish_woop     0.20 4.80 200 3000 -26
make_call "$PACK/shellfegio_09_pulse_train.wav"  fish_pulses   0.05 0.60 120 2500 -24
make_call "$PACK/shellfegio_10_purrr.wav"        fish_purr     0.05 1.00 120 2500 -24
make_call "$PACK/shellfegio_11_shrill.wav"       fish_shrill   0.05 1.00 300 7000 -26

# Triggerfish drumrolls: short bursts of a few in a row, cut from the quiet tank noise between them
make_call "$TRIGGER/1683,3365,3366_ParmentierE-2017_Rhinecanthus-aculeatus_Drumroll.wav" triggerfish_picasso   3.80  5.75 80 6000 -30
make_call "$TRIGGER/3366_RaickX-2018_Rhinecanthus-rectangulus_Drumroll.wav"              triggerfish_wedge    17.80 20.05 80 6000 -30
make_call "$TRIGGER/3366_RaickX-2018_Balistapus-undulatus_Drumroll.wav"                  triggerfish_orange    2.80  4.40 80 6000 -30
