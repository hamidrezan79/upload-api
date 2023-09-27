const express = require("express");
const app = express();
const env = require("dotenv");
const mongoose = require("mongoose");
const multer = require("multer");
const imageModel = require("./Model/model");
const Buffer = require("buffer").Buffer;
const fs = require("fs");
const md5 = require("md5");
const bodyParser = require("body-parser");
const sharp = require("sharp");
const cors = require("cors");
// init enviroments
env.config();

// define routes
const routes = require("./routes");
const { error } = require("console");
const { name } = require("ejs");
const path = require("path");

app.use(routes);
app.use(cors());
app.use(bodyParser.raw({ type: "application/octet-stream", limit: "1000mb" }));
app.use("images", express.static("uploads"));
console.log(process.env.MONGODB_URI);
console.log(process.env.APP_MODE);
app.use("/uploads", express.static("uploads"));

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    family: 4,
  })
  .then(() => console.log("Database is connected"))
  .catch((error) => console.log(error, "error"));

//storage
const Storage = multer.memoryStorage({
  destination: "uploads",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: Storage,
}).single("testImage");
// serv
app.get("/upload", async (req, res) => {
  try {
    const images = await imageModel.find();
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

let uploadedChunks = [];

app.post("/upload", async (req, res) => {
  upload(req, res, async () => {
    const { imageName, chunkNumber, totalChunks } = req.body;
    const lastChunk = parseInt(chunkNumber) === parseInt(totalChunks) - 1;
    const ext = imageName.split(".").pop();

    try {
      const extData = fs.readFileSync("./ext.json", "utf8");
      const jsonData = JSON.parse(extData);
      const validExtensions = jsonData
        .map((imageFormat) => imageFormat.extensions)
        .flat();
      if (validExtensions.includes(ext)) {
        const data = req.file.buffer;
        const buffer = Buffer.from(data);
        const tmpFileName = "tmp_" + md5(imageName + req.ip) + "." + ext;
        fs.writeFileSync("./uploads/" + tmpFileName, buffer, { flag: "a" });

        // آپلود تکه‌های آپلود شده را در آرایه ذخیره می‌کنیم
        uploadedChunks[chunkNumber] = true;

        if (lastChunk) {
          const allChunksUploaded = uploadedChunks.every(
            (chunk) => chunk === true
          );

          if (allChunksUploaded) {
            const finalFileName = md5(Date.now()).substring(0, 6) + "." + ext;
            const finalFilePath = "./uploads/" + finalFileName;
            fs.renameSync("./uploads/" + tmpFileName, finalFilePath);
            const filePath = finalFilePath;
            const cleanFilePath = filePath.replace(/^\.\//, "");

            const newImage = new imageModel({
              Name: finalFileName,
              Path: cleanFilePath,
              Size: fs.statSync(finalFilePath).size,
              CreateAt: Date.now(),
              ContentType: ext,
            });
            newImage.save();
            uploadedChunks = [];
            res.json({ finalFileName });
          } else {
            res.status(200).end();
          }
        } else {
          res.status(200).end();
        }
      } else {
        res.status(400).json("Invalid file format");
      }
    } catch (error) {
      console.error("Error reading/parsing JSON file:", error);
      res.status(500).json("Internal server error");
    }
  });
});
// delete api
app.delete("/delete/:Name", async (req, res) => {
  const imageName = req.params.Name;
  try {
    console.log( imageName);
    // افزودن کد برای بررسی وجود تصویر و حذف آن
    const imagePath = "uploads/" + imageName;

    if (fs.existsSync(imagePath)) {
      console.log("find image");
      fs.unlinkSync(imagePath);

      await imageModel.findOneAndRemove({ Name: imageName });

      res
        .status(200)
        .json({ message: `تصویر با نام ${imageName} با موفقیت حذف شد.` });
    } else {
      res.status(404).json({ message: `تصویر با نام ${imageName} یافت نشد.` });
    }
  } catch (error) {
    console.error("خطا در حذف تصویر:", error);
    res.status(500).json({ message: "خطای داخلی سرور" });
  }
});

const port = process.env.APP_PORT;
app
  .listen(port, () => {
    console.log(`app listening on port: http://localhost:${port}/upload`);
  })
  .on("error", (error) => {
    console.log(
      `Error Number: ${error.errno}`,
      `Error: ${error.syscall} ${error.code}: address already in use ${error.address}:${error.port}`
    );
  });
