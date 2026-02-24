$base = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$dest = "d:\0HACHWA\frontend\src\assets\models"
$files = @(
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)
foreach ($f in $files) {
    Write-Host "Downloading $f..."
    Invoke-WebRequest -Uri "$base/$f" -OutFile "$dest\$f" -UseBasicParsing
}
Write-Host "All models downloaded!"
