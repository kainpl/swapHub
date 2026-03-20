# Printer Setup Guide

## Prerequisites

- **Bambu Lab A1 Mini** (printer model N1)
- **Bambu Studio** or **Orca Slicer** installed
- SD card or network connection to the printer

---

## Step 1: Slice your model

1. Open your model in **Bambu Studio** or **Orca Slicer**
2. Configure print settings (layer height, infill, supports, etc.)
3. If you have multiple plates — arrange them as needed
4. Click **Slice** and wait for slicing to complete
5. Export / Save the project as `.3mf` file

> **Important:** The `.3mf` file must contain sliced G-code data. A raw (unsliced) project file won't work.

---

## Step 2: Generate SWAP file

1. Open **swapHub**
2. Drop your `.3mf` file into the drop zone
3. Configure each plate:
   - **Enable/Disable** — toggle plates on/off
   - **Repeats** — how many times each plate prints per loop
   - **Drag to reorder** — change the print order
4. Set **Loop repeats** — how many times the entire queue repeats
5. (Optional) Configure options:
   - **Disable Mech Mode fast check** — skip mechanical checks between plates (keeps the initial check on the first plate)
     - **Completely (including the first)** — additional checkbox that removes the check from all plates, including the first one
   - **Disable Dynamic Flow Calibration** — skip flow recalibration between plates
6. Choose a **cover plate** from the gallery (thumbnail for printer display)
7. Click **Generate SWAP file**

---

## Step 3: Send to printer

### Option A: SD Card

1. Copy the generated `.swap.3mf` file to your SD card
2. Insert the SD card into the printer
3. Select the file from the printer's menu and start printing

### Option B: Bambu Studio / Orca Slicer

1. Open the `.swap.3mf` file in Bambu Studio or Orca Slicer
2. Send to printer via network (LAN or cloud)

---

## How the queue works

The print queue is built from your plates configuration:

```
For each loop repeat:
  For each enabled plate (in order):
    Print the plate × its repeat count
```

**Example:**
- Plate **A** — 3 repeats
- Plate **B** — 1 repeat
- Loop repeats — 2

Result: `A A A B A A A B`

---

## G-code structure

The generated `.swap.3mf` contains a single merged G-code file (`plate_1.gcode`) that includes:

1. **Start G-code** from the first plate (homing, heating, bed leveling)
2. For each plate in the queue:
   - The plate's G-code (print moves)
   - Swap sequence (bed clearing, plate change commands)
3. **End G-code** from the last plate (motor shutdown, parking)

On the last plate the order is: print → plate swap → finish block (FIN). The plate is swapped **before** the motors are disabled, so you can remove the finished print.

### Swap sequence between plates

Between each plate print, the following G-code is inserted:

```gcode
; ===== swap: plate X =====
M400 S1        ; Wait for moves to finish
G28 X           ; Home X axis
M400 S1        ; Wait
; ... plate clearing sequence ...
```

---

## G-code markers in the slicer

For the **Disable Mech Mode fast check**, **Disable Dynamic Flow Calibration** options and proper finish block trimming to work, the G-code must contain special comment markers. You need to add them in the slicer settings (Bambu Studio or Orca Slicer) in the corresponding G-code sections.

### MMFC — Mech Mode Fast Check

Wrap the mechanical check block in your start G-code with markers:

```gcode
G1 Z5 F3000
;===START: MMFC===
  G1 X90 Y-1 F30000
  M400 P200
  M970.3 Q1 A7 K0 O2
  M974 Q1 S2 P0

  G1 X90 Y0 Z5 F30000
  M400 P200
  M970 Q0 A10 B50 C90 H15 K0 M20 O3
  M974 Q0 S2 P0
;===END: MMFC===
M975 S1
G1 F30000
G1 X-1 Y10
G28 X ; re-home XY
```

swapHub looks for these markers and removes the entire block between them. Without the markers, the option will have no effect.

**Where to add:** Printer Start G-code in slicer settings.

<!-- TODO: detail which specific commands should be inside the MMFC block -->

### DFC — Dynamic Flow Calibration

Wrap the flow calibration block with markers:

```gcode
;M1002 set_flag extrude_cali_flag=1
;===START: DFC===
M1002 judge_flag extrude_cali_flag
M622 J1
    M1002 gcode_claim_action : 8

    M400
    M900 K0.0 L1000.0 M1.0
    G90
    M83
    G0 X68 Y-4 F30000
    G0 Z0.3 F18000 ;Move to start position
    M400
    G0 X88 E10  F{outer_wall_volumetric_speed/(24/20)    * 60}
    G0 X93 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)/4     * 60}
    G0 X98 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)     * 60}
    G0 X103 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)/4     * 60}
    G0 X108 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)     * 60}
    G0 X113 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)/4     * 60}
    G0 Y0 Z0 F20000
    M400

    G1 X-13.5 Y0 Z10 F10000
    M400

    G1 E10 F{outer_wall_volumetric_speed/2.4*60}
    M983 F{outer_wall_volumetric_speed/2.4} A0.3 H[nozzle_diameter]; cali dynamic extrusion compensation
    M106 P1 S178
    M400 S7
    G1 X0 F18000
    G1 X-13.5 F3000
    G1 X0 F18000 ;wipe and shake
    G1 X-13.5 F3000
    G1 X0 F12000 ;wipe and shake
    G1 X-13.5 F3000
    M400
    M106 P1 S0

    M1002 judge_last_extrude_cali_success
    M622 J0
        M983 F{outer_wall_volumetric_speed/2.4} A0.3 H[nozzle_diameter]; cali dynamic extrusion compensation
        M106 P1 S178
        M400 S7
        G1 X0 F18000
        G1 X-13.5 F3000
        G1 X0 F18000 ;wipe and shake
        G1 X-13.5 F3000
        G1 X0 F12000 ;wipe and shake
        M400
        M106 P1 S0
    M623

    G1 X-13.5 F3000
    M400
    M984 A0.1 E1 S1 F{outer_wall_volumetric_speed/2.4} H[nozzle_diameter]
    M106 P1 S178
    M400 S7
    G1 X0 F18000
    G1 X-13.5 F3000
    G1 X0 F18000 ;wipe and shake
    G1 X-13.5 F3000
    G1 X0 F12000 ;wipe and shake
    G1 X-13.5 F3000
    M400
    M106 P1 S0
M623 ; end of "draw extrinsic para cali paint"
;===END: DFC===

;Load DFC settings from memory
M622 J0
    M984 A0.1 E1 S0 F{outer_wall_volumetric_speed/2.4} H[nozzle_diameter]
M623
```

Additionally, swapHub looks for the line `;M1002 set_flag extrude_cali_flag=1` and appends `M1002 set_flag extrude_cali_flag=0` after it to cancel the calibration flag on non-first plates.

**Where to add:** Printer Start G-code in slicer settings.

<!-- TODO: detail which specific commands should be inside the DFC block -->

### FIN — Finish block

Wrap the finish G-code (cooldown, parking, heater shutdown) with markers (add at the very end of the code):

```gcode
;===START: FIN===
M400 ; wait all motion done
M18 X Y Z ; disable steppers, except E
;===END: FIN===
```

swapHub automatically removes the finish block from **all plates except the last one** — so the printer doesn't cool down or park between prints, and only executes the finish sequence after the final plate in the queue.

**Where to add:** Printer End G-code in slicer settings.

> **Important:** If the markers are missing from the G-code, the corresponding swapHub options will simply have no effect — no error will occur, but the blocks won't be recognized or removed.

---

## Troubleshooting

### "This file is sliced for X printer"

SwapMod only works with **Bambu Lab A1 Mini (N1)**. Make sure you selected A1 Mini as your printer in the slicer before slicing.

### File won't open / "Cannot read file"

Make sure the file is a valid `.3mf` archive. Try re-exporting from your slicer.

### "No sliced plates found"

The file contains geometry but no G-code. You need to **Slice** the model first, then save/export.

### Print fails mid-swap

- Ensure the bed is clean and plate adhesion is good
- Consider disabling **Mech Mode fast check** if the printer pauses too long between plates. If the initial check also causes issues — enable **Completely (including the first)** as well
- Check that filament is loaded in the correct AMS slots
