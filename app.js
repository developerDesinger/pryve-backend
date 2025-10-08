const createError = require("http-errors");
const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const globalErrorHandler = require("./src/api/v1/middlewares/globalErrorHandler");
const multer = require("multer");
const path = require("path");
const {
  uploadToS3,
  uploadaudiovideeToS3,
  uploadFileToS3,
} = require("./src/api/v1/services/aws.service");

if (process.env.NODE_ENV === "PRODUCTION") {
  require("dotenv").config({ path: "./.env.production" });
} else {
  require("dotenv").config();
}

const usersRoutes = require("./src/api/v1/routes/user");
// const cronRoutes = require("./src/api/v1/routes/cron");
const app = express();
//const admin = require("firebase-admin");

// Middleware
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(helmet());

if (process.env.NODE_ENV === "DEVELOPMENT") {
  app.use(logger("dev"));
}

app.use(mongoSanitize());
app.use(xssClean());
app.use(hpp());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  console.log(`\n🚀 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`📋 Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
  console.log(`🔍 Query:`, JSON.stringify(req.query, null, 2));
  console.log(`👤 User Agent:`, req.headers['user-agent'] || 'Unknown');
  console.log(`🌐 Origin:`, req.headers['origin'] || 'No Origin');
  
  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`✅ [${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    console.log(`📤 Response:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    console.log(`📊 Response Headers:`, JSON.stringify(res.getHeaders(), null, 2));
    console.log('─'.repeat(80));
    
    originalSend.call(this, data);
  };
  
  next();
});

// Super simple CORS - allow everything
app.use(cors({
  origin: '*',
  credentials: false,
  methods: '*',
  allowedHeaders: '*',
  exposedHeaders: '*'
}));

// Simple fallback for any CORS issues
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});
app.use(compression());
app.use(cookieParser());

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'image') {
      cb(null, 'uploads/images/');
    } else if (file.fieldname === 'audio') {
      cb(null, 'uploads/audio/');
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter for audio
const audioFilter = (req, file, cb) => {
  console.log('Audio file filter - MIME type:', file.mimetype, 'Original name:', file.originalname);
  
  // Check MIME type
  const validMimeTypes = [
    'audio/mpeg',
    'audio/mp3', 
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/vnd.wave'
  ];
  
  // Check file extension as fallback
  const validExtensions = ['.mp3', '.wav', '.wave'];
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  
  if (validMimeTypes.includes(file.mimetype) || validExtensions.includes(fileExtension)) {
    console.log('Audio file accepted:', file.originalname);
    cb(null, true);
  } else {
    console.log('Audio file rejected - MIME:', file.mimetype, 'Extension:', fileExtension);
    cb(new Error(`Only MP3 and WAV audio files are allowed! Received: ${file.mimetype} (${file.originalname})`), false);
  }
};

// Multer instances
const uploadImage = multer({ 
  storage: storage, 
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  }
});

const uploadAudio = multer({ 
  storage: storage, 
  fileFilter: audioFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for audio files
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Serve test page
app.get('/test-upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-upload.html'));
});

// Routes
app.use("/api/v1/users", usersRoutes);
// app.use("/api/v1/cron", cronRoutes);



app.post("/upload-image", async (req, res) => {
  try {
    const { imageBase64, contentType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Missing imageBase64 in request body"
      });
    }

    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: "Missing contentType in request body"
      });
    }

    // Validate base64 format
    if (!imageBase64.startsWith('data:') && !imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid base64 format"
      });
    }

    // Call the uploadImage method of the ImageUploader class
    const result = await uploadToS3(imageBase64, contentType);

    if (result.success) {
      return res.status(200).json(result); // Successful upload
    } else {
      return res.status(500).json(result); // Error during upload
    }
  } catch (error) {
    console.error("Image upload error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image"
    });
  }
});

// Media upload handler
const s3MediaUploadB = async (file, mediaType) => {
  try {
    // Clean the base64 string
    const base64Data = file.replace(/^data:.+;base64,/, "");

    if (!base64Data) {
      throw new Error("Invalid or empty base64 data");
    }

    const buffer = Buffer.from(base64Data, "base64");

    let contentType;
    let folder;

    if (mediaType === "audio") {
      // Determine content type based on file extension or MIME type
      if (file.includes('data:audio/wav') || file.includes('audio/wav')) {
        contentType = "audio/wav";
      } else {
        contentType = "audio/mpeg"; // Default to MP3
      }
      folder = "audio";
    } else if (mediaType === "video") {
      contentType = "video/mp4";
      folder = "video";
    } else {
      throw new Error("Invalid media type");
    }

    return await uploadaudiovideeToS3(buffer, contentType, folder);
  } catch (error) {
    console.error("Media upload failed:", error);
    throw new Error("Media upload failed");
  }
};

// API endpoint to handle media upload
app.post("/upload-media", async (req, res) => {
  try {
    const { file, mediaType } = req.body;

    // Validate file and mediaType
    if (!file || !mediaType) {
      return res
        .status(400)
        .json({ message: "File and media type are required" });
    }

    // Validate base64 format
    if (!file.startsWith("data:")) {
      return res.status(400).json({ message: "Invalid base64 format" });
    }

    const result = await s3MediaUploadB(file, mediaType);

    res.status(200).json({
      message: "Media uploaded successfully",
      fileUrl: result,
    });
  } catch (error) {
    console.error("Media upload failed:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/upload-file", async (req, res) => {
  const { fileBase64, contentType } = req.body;
  if (!fileBase64) {
    return res.status(400).json({ success: false, message: "Missing file or contentType" });
  }
  const result = await uploadFileToS3(fileBase64, contentType);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
});

// Image upload API using multer
app.post("/upload-image-multer", (req, res) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) {
      console.error("Image upload error:", err);
      
      // Handle specific multer errors
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: `Unexpected field '${err.field}'. Expected field name: 'image'`
        });
      }
      
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to upload image"
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided"
        });
      }

      const fileUrl = `/uploads/images/${req.file.filename}`;
      
      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: fileUrl,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload image"
      });
    }
  });
});

// Audio upload API using multer
app.post("/upload-audio-multer", (req, res) => {
  uploadAudio.single('audio')(req, res, (err) => {
    if (err) {
      console.error("Audio upload error:", err);
      
      // Handle specific multer errors
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: `Unexpected field '${err.field}'. Expected field name: 'audio'`
        });
      }
      
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to upload audio"
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No audio file provided"
        });
      }

      const fileUrl = `/uploads/audio/${req.file.filename}`;
      
      res.status(200).json({
        success: true,
        message: "Audio uploaded successfully",
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: fileUrl,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error("Audio upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload audio"
      });
    }
  });
});

// Catch-all route for undefined routes
app.use("*", function (req, res, next) {
  next(createError(404));
});

// Global error handler
app.use(globalErrorHandler);

// Error logging middleware
app.use((error, req, res, next) => {
  console.error(`\n❌ [${new Date().toISOString()}] ERROR in ${req.method} ${req.url}`);
  console.error(`🔍 Error Details:`, {
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    name: error.name
  });
  console.error(`📋 Request Headers:`, JSON.stringify(req.headers, null, 2));
  console.error(`📦 Request Body:`, JSON.stringify(req.body, null, 2));
  console.error(`🔍 Request Query:`, JSON.stringify(req.query, null, 2));
  console.error('─'.repeat(80));
  
  next(error);
});

module.exports = app;
