# LabCal — offsets vault, jobsheet worklist, iPad saving (v1.4)

Load each offsets file **once, on the home page**. Every worksheet then picks it
up automatically until the reference thermometer's certificate expires.

## v1.4 — saving files on iPad

**The constraint:** a web page cannot choose a save folder on iPad. Safari has
no save-file picker, and Chrome on iPad is Safari underneath, so it inherits the
same limit. That part cannot be coded around.

**What now happens instead:** every generated file goes through
`labcal_save.js`, which picks the best route the device actually offers.

- **Desktop (Chrome/Edge)** — the native save dialog, exactly as before.
- **iPad** — a bar appears at the bottom: *"PDF ready — Save / Share"*. Tapping
  it opens the iOS share sheet, where **Save to Files** lets you choose any
  folder, including iCloud, OneDrive and Dropbox. Or send it straight to Mail
  without saving first. There is also a **Download** button on the bar if you
  just want the old behaviour.
- **Anything else** — a plain download, unchanged.

The extra tap is deliberate and unavoidable: iOS only allows a share that comes
from a fresh tap, and generating a PDF takes long enough that the original
button press has gone stale. Cancelling the share sheet leaves the bar up so the
file is never lost.

This covers **PDF and Excel from every worksheet**, the **merged PDF** from the
merge tool, and the **chart PNG and summary CSV** from the data logger viewer.

## v1.3 — jobsheet worklist

Load the jobsheet PDF **once, on the calibration page**. It becomes the day's
worklist: every unit on the sheet gets a row, routed to the correct worksheet,
and opening one carries the customer, job reference, model, serial and location
straight into the header. No jobsheet? The panel stays out of the way and you
pick a worksheet exactly as before.

**Routing.** I only know three rules for certain (Barkey, Cloud Temp, Thermo/
Monitor Max), so anything else asks you the first time — and then remembers it.
Pick "Standard Medical" for an RLDF1010A once and every future jobsheet routes
that model itself. The learned list lives in `labcal.jobsheet.routes`; the
hard-coded rules are the `RULES` array at the top of `labcal_jobsheet.js` if you
would rather state them outright.

**Ticks.** Generating a certificate ticks that unit off the worklist and records
its certificate number, so the panel always shows what's left.

**Safety.** A device is handed to a worksheet exactly once, and only ever fills
fields that are empty — reopening a worksheet can never overwrite readings you
have already taken.

The parser is the same one that was already inside the worksheets (four jobsheet
layouts plus a generic fallback), moved into `labcal_jobsheet.js` unchanged so
there is now one copy instead of five.

## v1.2.1 — frozen tiles fix (iPad)

v1.2 had a bug that froze the tiles whenever **two or more tabs of the site were
open at once**. The vault checked whether storage was usable by writing a
throwaway key on *every read* — and that key sat inside the range of keys the
other tabs were watching. So each tab's read woke the other tab, which read,
which woke the first one back, hundreds of times a second. Tiles were rebuilt
mid-tap (hence frozen and jittering) and taps landed on elements that no longer
existed. Closing every tab cleared it because the loop needs two tabs to bounce
between.

Fixed three ways: the storage check now runs once per page and writes outside
the watched key range; change listeners ignore anything that isn't one of the
two ecosystem keys and skip redundant redraws; and tiles are only rewritten when
the markup has actually changed, so a redraw can never swallow a tap.

Also: an open worksheet no longer rebuilds its dropdowns unless the offsets file
genuinely changed, so a probe you have already selected mid-job stays selected.

## Upload these files

Everything in this folder goes to the same directory on your site. The files
that actually changed:

| File | What changed |
|---|---|
| `labcal_offsets.js` | The shared offsets vault. Must sit next to the HTML files. |
| `labcal_jobsheet.js` | Jobsheet parser, worklist and worksheet routing. |
| `labcal_save.js` | **NEW** — save/share routing, including the iOS share sheet. |
| `index.html` | Offsets panel with countdown + warnings; Calibration section locks until a file is loaded |
| `calibration.html` | Jobsheet worklist panel; each worksheet card locks unless *its own* ecosystem's file is loaded |
| `monitoring_systems.html` | Same gating for Cloud Temp |
| `barkey_calibration_form.html` | Auto-loads Dostmann offsets from the vault |
| `calibration_worksheet_SMD.html` | Auto-loads Dostmann offsets |
| `calibration_worksheet_SNMD.html` | Auto-loads Fluke & Comark offsets |
| `calibration_worksheet_19_24.html` | Auto-loads Fluke & Comark offsets |
| `cloud_temp.html` | Auto-loads Fluke & Comark offsets |
| `sw.js` | Cache bumped to **v8**, caches all three shared modules |
| `data_logger_viewer.html` | Chart PNG and summary CSV go through the share sheet on iPad |
| `pdf_merge_reorder.html` | Merged PDF goes through the share sheet on iPad |
| `tools.html` | Unchanged — included so the folder is complete |

After uploading, open the home page once while online so the service worker
picks up v8, then hit **Refresh offline copy**.

## Which file unlocks what

| Ecosystem | Unlocks |
|---|---|
| **Dostmann** | Barkey · Standard Medical Device |
| **Fluke & Comark** | Standard Non-Medical · 19/24 Range · Monitoring Systems (Cloud Temp) |

The two are never interchangeable — loading a Fluke file into the Dostmann slot
is refused with a clear message, and vice versa.

## Countdown and warnings

The vault counts down to the **last day of the "valid until" month**.

- more than 60 days left → green "Valid to Mon/YYYY"
- 60 days or less → amber "N days left" on the home page
- 14 days or less → red pulsing warning on the home page **and** an amber strip
  at the top of every worksheet
- expired → everything using that file locks; no PDF or Excel can be generated

## Still to come

- **Day panel** of the certificates generated, with a single merged PDF at the
  end of the day.

## Notes

- Storage is the browser's `localStorage` for this site, so it is per-device and
  per-browser. iPad Safari clears it after about 7 days with no visits to the
  site — if that happens, just load the files again on the home page.
- The "Load offsets" button on each worksheet still works and now **writes back
  to the vault**, so loading a file on any worksheet updates all the others.
- If `labcal_offsets.js` is ever missing, nothing locks up: the pages fall back
  to the old per-worksheet behaviour.
