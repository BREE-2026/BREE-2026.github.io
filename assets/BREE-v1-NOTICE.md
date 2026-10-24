# BREE-v1 reference material

Source: https://github.com/YyyYyy0604/BREE-v1
Revision: e97d1b6e76f29ea91dc4500a3dff76feb2b77bdb

The BREE setup documentation adapts command examples from BREE/README.md, BREE/docs/README.md, BREE/model_training/README.md and BREE/openpi_eval/README.md, and configuration details from BREE/configs/. Commands are checked against the corresponding scripts. Prose, presentation and recording/training-configuration generation were adapted for this website.

The following camera reference images are copied unchanged from BREE/camera_reference/:

- assets/img/calibration/reference-global.jpg: global_image/reference.jpg
- assets/img/calibration/reference-left-wrist.jpg: overlay/left_wrist/reference.jpg
- assets/img/calibration/reference-right-wrist.jpg: overlay/right_wrist/reference.jpg

The source repository includes the Apache License 2.0 in LICENSE; a copy is provided in BREE-v1-LICENSE.txt.

## Camera image controls

The camera-parameter section in `setup/calibration.html` documents `BREE/camera_calibration/calibrate_three_camera_white_balance.py`, `BREE/camera_calibration/apply_camera_image_controls.py` and the example `camera_image_controls.json`, checked against revision `e97d1b6e76f29ea91dc4500a3dff76feb2b77bdb`. Command options, UI controls, save keys and restore behavior are based on these scripts; local tuning and daily checks are presented as an operating procedure.

## ID benchmark images

The 45 raw ID reference images and two distribution guides under `assets/img/evaluation/id/` are copied unchanged from `outputs/id_ood_benchmark_pairs/` at revision `e97d1b6e76f29ea91dc4500a3dff76feb2b77bdb`. `reference-index.json` records the source directories, dataset identifiers and episode indexes. Its task numbers are adapted to this website’s 3DAssets numbering. OOD images are not present in this revision.

## Operating-guide command coverage

The 28 Bash blocks in `BREE/README.md` at the revision above are represented across `setup/software.html`, `setup/calibration.html`, `setup/collection.html` and `setup/evaluation.html`, including optional calibration without preview, all five training paths, data conversion/statistics, RDT/OpenPI resume commands and all five evaluation paths. Environment names and experiment/checkpoint paths are adapted to the website workflow. Path-valued training options and camera rename dictionaries are placed in generated JSON where needed for this revision’s parser. Source commands are cross-checked against script options and configuration fields. Parameter explanations cover the README’s evaluation-setting table. RDT language-embedding preparation is additionally documented from its encoder script.
