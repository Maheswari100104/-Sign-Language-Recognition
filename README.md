🤟 AI-Based Sign Language Recognition and Speech Generation
📌 Project Overview

Communication can be challenging when sign language users interact with people who are unfamiliar with sign language. This project aims to bridge that gap by using Artificial Intelligence, Computer Vision, and Deep Learning to recognize sign language alphabets in real time and convert them into text and speech.

The system captures hand signs through a webcam, recognizes the corresponding alphabet using a trained MobileNetV2 model, forms meaningful sentences, and generates voice output for both individual letters and complete sentences.

🎯 Features

✅ Real-time hand sign detection

✅ Sign language alphabet recognition (A–Z)

✅ AI-powered classification using MobileNetV2

✅ Confidence score display

✅ Prediction smoothing for stable recognition

✅ Letter-by-letter voice feedback

✅ Real-time sentence formation

✅ Space, Delete, and Clear controls

✅ Complete sentence speech generation

✅ User-friendly interface

## 🛠️ Technology Stack

### Programming Language
- Python 3.10

### Artificial Intelligence & Deep Learning
- TensorFlow
- Keras
- MobileNetV2

### Computer Vision
- OpenCV
- MediaPipe
- CVZone

### Libraries & Utilities
- NumPy
- Pillow
- pyttsx3 (Text-to-Speech)
- Threading
- Collections (Counter)

### Development Environment
- Jupyter Notebook
  
## 🔄 System Workflow

```text
Webcam
   ↓
Hand Detection (CVZone)
   ↓
Image Preprocessing
   ↓
MobileNetV2 Prediction
   ↓
Prediction Smoothing
   ↓
Text Generation
   ↓
Sentence Formation
   ↓
Text-to-Speech Output

```

## 📂 Project Structure

```text
AI-Based-SignLanguageRecognition_and_Speechgeneration/
│
├── dataset/
│   ├── train/
│   ├── validation/
│   └── test/
│
├── models/
│   ├── sign_alphabet_mob_model.keras
│   └── class_indices_mob.npy
│
├── notebooks/
│   ├── training.ipynb
│   └── evaluation.ipynb
│
├── signdetection_overlaysentencevoice.ipynb
├── signdetection_overlaysentencevoice.py
├── requirements.txt
└── README.md
```

## 🧠 Model Information

### Model Architecture
- **Model:** MobileNetV2 (Transfer Learning)
- **Framework:** TensorFlow / Keras
- **Task:** Real-Time Sign Language Alphabet Recognition

### Input Specifications
- **Input Size:** 224 × 224 × 3
- **Image Preprocessing:** MobileNetV2 `preprocess_input()`
- **Color Format:** RGB

### Training Configuration
- **Transfer Learning:** ImageNet Pretrained MobileNetV2
- **Optimizer:** Adam
- **Loss Function:** Categorical Crossentropy
- **Evaluation Metric:** Accuracy

### Data Augmentation
- Rotation
- Zoom
- Width Shift
- Height Shift

### Prediction Pipeline
1. Capture live video from the webcam.
2. Detect the hand using CVZone.
3. Extract the Region of Interest (ROI).
4. Resize the image to **224 × 224**.
5. Apply MobileNetV2 preprocessing.
6. Predict the corresponding alphabet.
7. Display the confidence score.
8. Apply prediction smoothing.
9. Convert the recognized text into speech.

### Prediction Enhancement
- ✅ Prediction smoothing for stable recognition
- ✅ Real-time confidence scoring
- ✅ Letter-by-letter speech feedback
- ✅ Sentence formation
- ✅ Complete sentence speech generation

### Model Performance

| Metric | Value |
|---------|--------|
| Validation Accuracy | **97.28%** |
| Test Accuracy | **96.80%** |
| Prediction Type | Real-Time |
| Output | Alphabet → Text → Speech |

## 🚀 Installation

Follow the steps below to set up and run the project on your local machine.

### 1. Clone the Repository

```bash
git clone https://github.com/rajicoding/AI_Based_SignLanguageRecognition_and_Speechgeneration.git
```

### 2. Navigate to the Project Directory

```bash
cd AI_Based_SignLanguageRecognition_and_Speechgeneration
```

### 3. Create a Virtual Environment

```bash
python -m venv signlang
```

### 4. Activate the Virtual Environment

**Windows**

```bash
signlang\Scripts\activate
```

**Linux / macOS**

```bash
source signlang/bin/activate
```

### 5. Install the Required Dependencies

```bash
pip install -r requirements.txt
```

### 6. Run the Application

#### Option 1: Run the Jupyter Notebook

```bash
jupyter notebook signdetection_overlaysentencevoice.ipynb
```

#### Option 2: Run the Python Script

```bash
python signdetection_overlaysentencevoice.py
```

The webcam will open automatically and start recognizing hand signs in real time.


## 🎮 Controls

| Key | Function |
|------|----------|
| **Space** | Add a space between words |
| **Backspace** | Delete the last recognized letter |
| **C** | Clear the entire sentence |
| **Enter** | Convert the complete sentence into speech |
| **Q** | Quit the application |

## 🎥 Demo

Watch the project in action and see how AI transforms sign language into text and speech in real time.

**Demo Highlights**
- 🤟 Live hand sign detection
- 🔤 Real-time alphabet recognition
- 📝 Sentence formation
- 🔊 Letter-by-letter voice feedback
- 🎙️ Complete sentence speech generation

▶️ **Demo Video:** [*[LinkedIn video link here)](https://www.linkedin.com/posts/rajarajeswari-ramanathan-8a267865_artificialintelligence-computervision-deeplearning-ugcPost-7480141030093217792-iE_z/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAA3NifoBwRlq2hvG6fVZvo3a3A42zqW3IA8)*]

## 🚀 Future Enhancements

- 🌍 Extend the system to recognize complete words and sentences.
- 🧤 Support dynamic gestures and continuous sign language translation.
- 🎯 Improve recognition accuracy using larger and more diverse datasets.
- 🌐 Deploy the application as a web-based platform for easy accessibility.
- 📱 Develop a mobile application for real-time communication.
- 🌎 Add support for multiple sign languages beyond the current dataset.

## 💡 Key Learnings

This project was more than building a sign language recognition system—it was an opportunity to understand how different AI technologies work together to solve a real-world problem.

Through this project, I gained hands-on experience in:

- 🤖 Developing an end-to-end AI application.
- 🧠 Applying Transfer Learning with MobileNetV2.
- 📷 Building a real-time Computer Vision pipeline.
- 🖐️ Detecting and tracking hand gestures using CVZone and MediaPipe.
- 🔤 Converting visual input into meaningful text.
- 🔊 Integrating Text-to-Speech for real-time voice generation.
- 🛠️ Debugging, optimizing, and improving model performance for real-time inference.
- 🚀 Designing an AI solution with accessibility and inclusivity in mind.

## 👩‍💻 About the Author

Hi, I'm **Rajee**! 👋

I'm an aspiring **AI & Data Science Engineer** with a passion for **Computer Vision, Deep Learning, and Machine Learning**. I enjoy building AI-powered applications that solve real-world problems while continuously learning and sharing my journey.

### 📬 Connect with Me

- 💼 **LinkedIn:** www.linkedin.com/in/rajarajeswari-ramanathan-8a267865
- 💻 **GitHub:** https://github.com/rajicoding
- 📧 **Email:** <raji5585@gmail.com>

If you enjoyed this project, consider giving it a ⭐ and feel free to connect with me to discuss AI, Machine Learning, and Computer Vision!
Connect with Me

