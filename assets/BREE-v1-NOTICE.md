# BREE-v1 reference material

Source: https://github.com/YyyYyy0604/BREE-v1
Revision: b2291786cf659641ddda7b964a1f1c60f970a09f

The BREE setup documentation adapts command examples from BREE/README.md and configuration details from BREE/configs/. Prose, presentation and recording-configuration generation were adapted for this website.

The following camera reference images are copied unchanged from BREE/camera_reference/:

- assets/img/calibration/reference-global.jpg: global_image/reference.jpg
- assets/img/calibration/reference-left-wrist.jpg: overlay/left_wrist/reference.jpg
- assets/img/calibration/reference-right-wrist.jpg: overlay/right_wrist/reference.jpg

The source repository includes the Apache License 2.0 in LICENSE; a copy is provided in BREE-v1-LICENSE.txt.

## Camera image controls

The camera-parameter section in `setup/calibration.html` documents `BREE/camera_calibration/calibrate_three_camera_white_balance.py`, `BREE/camera_calibration/apply_camera_image_controls.py` and the example `camera_image_controls.json`, checked against revision `e97d1b6e76f29ea91dc4500a3dff76feb2b77bdb`. Command options, UI controls, save keys and restore behavior are based on these scripts; local tuning and daily checks are presented as an operating procedure.

## ID benchmark images

The 45 raw ID reference images and two distribution guides under `assets/img/evaluation/id/` are copied unchanged from `outputs/id_ood_benchmark_pairs/` at revision `e97d1b6e76f29ea91dc4500a3dff76feb2b77bdb`. `reference-index.json` records the source directories, dataset identifiers and episode indexes. Its task numbers are adapted to this website’s 3DAssets numbering. OOD images are not present in this revision.
