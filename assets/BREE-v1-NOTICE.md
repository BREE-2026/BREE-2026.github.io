# BREE-v1 reference material

Source: https://github.com/YyyYyy0604/BREE-v1
Revision: e97d1b6e76f29ea91dc4500a3dff76feb2b77bdb

The operating-guide content is reproduced from the local `BREE/README.md`, `BREE/model_training/README.md` and `BREE/openpi_eval/README.md`, with commands, paths, placeholders and prose preserved. HTML presentation and page navigation are supplied by this website. The installation supplement uses environment/package commands from `docs/source/installation.mdx` and Git steps to obtain the complete BREE fork in a workspace named `lerobot`.

The following camera reference images are copied unchanged from BREE/camera_reference/:

- assets/img/calibration/reference-global.jpg: global_image/reference.jpg
- assets/img/calibration/reference-left-wrist.jpg: overlay/left_wrist/reference.jpg
- assets/img/calibration/reference-right-wrist.jpg: overlay/right_wrist/reference.jpg

The source repository includes the Apache License 2.0 in LICENSE; a copy is provided in BREE-v1-LICENSE.txt.

## Camera image controls

The camera-parameter section in `setup/calibration.html` documents `BREE/camera_calibration/calibrate_three_camera_white_balance.py`, `BREE/camera_calibration/apply_camera_image_controls.py` and the example `camera_image_controls.json`, checked against revision `e97d1b6e76f29ea91dc4500a3dff76feb2b77bdb`. Command options, UI controls, save keys and restore behavior are based on these scripts; local tuning and daily checks are presented as an operating procedure.

## ID benchmark images

The 45 raw ID reference images and two distribution guides under `assets/img/evaluation/id/` are copied unchanged from `outputs/id_ood_benchmark_pairs/` at revision `e97d1b6e76f29ea91dc4500a3dff76feb2b77bdb`. `reference-index.json` records the source directories, dataset identifiers and episode indexes. Its task numbers are adapted to this website’s 3DAssets numbering. OOD images are not present in this revision.

## Operating-guide content coverage

All 13 numbered sections and the opening preamble of the local `BREE/README.md` are reproduced across `setup/index.html`, `setup/software.html`, `setup/calibration.html`, `setup/collection.html`, `setup/training.html`, `setup/evaluation.html` and `setup/troubleshooting.html`. All 192 content blocks, including 45 fenced blocks (28 Bash), are retained. Commands are not rewritten as generated configuration files; paths, parameter values, quoting, indentation and placeholders remain as written in the source.

Source file SHA-256 (raw bytes): `f329581111df7ee24b0311605cb51135352496ab7255c1d13198b5e91af255b7`.

Run `python scripts/check_readme_guides.py` to compare every source block with the generated HTML and every decoded code block character for character. CRLF/LF line endings are normalized for HTML. This checks documentation fidelity without executing hardware, data-collection, training or evaluation commands.

## Expanded operating references

- `BREE-v1/BREE/model_training/README.md`: all 55 content blocks, including 16 fenced blocks, are reproduced in `setup/training.html`. Source SHA-256 (raw bytes): `e882ff47b6206b6b2a7f299d7ed1bde244f22c73d6cf7094bb7c28a14a92a7b5`.
- `BREE-v1/BREE/openpi_eval/README.md`: all 20 content blocks, including 7 fenced blocks, are reproduced in `setup/evaluation.html`. Source SHA-256 (raw bytes): `776cb5fc2d9d3db07e7e6ccddb2b691d8efcf2b5a7aabc7b0cde410fc0860f28`.

The two OpenPI client examples retain their original, different wrist-camera index values (2/4 in the operating README; 4/2 in the OpenPI README). The page identifies both sources and requires checking the actual device mapping. No command is combined or rewritten to reconcile the examples.

The checker now covers all three complete operating documents, including independently decoded HTML code text.

## Bilingual presentation

The original Chinese prose is retained alongside English translations from
`assets/i18n/readme-*-en.json`. Language switching affects prose, headings, lists
and table cells. Fenced code is shared between both languages and remains
unchanged. Inline code identifiers, paths and parameter values are preserved in
each translation. The checker validates both the source content and this paired
presentation. Calibration section grouping, heading scale and paired reference
images follow the website's visual structure at revision `67f3550`.
