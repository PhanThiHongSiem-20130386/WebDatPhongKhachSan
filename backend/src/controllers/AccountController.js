const accountModel = require("../config/db/models/Account");
const bcrypt = require("bcrypt");
const sendConfirmationEmail = require("../config/db/models/SendEmail");
const keys = require("../key.json");
const fs = require("fs");
const { google } = require("googleapis");
const SCOPE = ["https://www.googleapis.com/auth/drive"];
const { Readable } = require("stream");
class AccountController {
  get(req, res) {
    let result = accountModel.get_all();
    result
      .then(function (value) {
        console.log(value);
        res.json(value);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
  findById(req, res) {
    let result = accountModel.find(req.query.id);
    result
      .then(function (value) {
        console.log(value);
        res.json(value);
      })
      .catch(function (error) {
        console.log(error);
      });
  }

  async register(req, res) {
    const otp = accountModel.generateOTP();
    const { password, repassword, email, phone } = req.body;
    const salt = bcrypt.genSaltSync(10);
    const pass_encrypt = bcrypt.hashSync(password, salt);
    const data = {
      password: pass_encrypt,
      email,
      phone,
      status: 0,
      role: 0,
      createDate: new Date(),
    };

    if (password !== repassword) {
      return res.status(400).json({ error: "Mật khẩu nhập lại không khớp" });
    }

    try {
      const userConfirm = await accountModel.findByEmail(email);
      let result;
      if (!userConfirm) {
        result = await accountModel.create(data);
      } else if (userConfirm.status === 0) {
        result = await accountModel.updateByEmail(email, data);
      } else {
        return res.status(403).json({ error: "Tài khoảng đã tồn tại" });
      }

      req.session.otpInfo = {
        email: req.body.email,
        otp: otp,
        otpExpiration: Date.now() + 5 * 60 * 1000, // Hết hạn sau 5 phút
      };
      sendConfirmationEmail(req.body.email, otp);
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Server internal error" });
    }
  }

  verifyOTP(req, res) {
    const { otp, email } = req.body;
    const { otpInfo } = req.session;
    if (!otp || !otpInfo || !otpInfo.otp || !otpInfo.email) {
      return res
        .status(400)
        .json({ error: "OTP information is missing or invalid" });
    }
    if (otp !== otpInfo.otp || email !== otpInfo.email) {
      return res.status(400).json({ error: "Invalid OTP or Email" });
    }
    if (Date.now() > otpInfo.otpExpiration) {
      return res.status(400).json({ error: "OTP expired" });
    }

    accountModel
      .updateByEmail(email, { status: 1 })
      .then((user) => {
        res.json({ message: "OTP verified successfully", user });
        delete req.session.otpInfo;
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
      });
  }
  verifyUserRegister(req, res) {
    const email = req.body;
    if (accountModel.findByEmail(email)) {
      return;
    }
  }

  update(req, res) {
    const newData = {
      useName: req.body.useName,
      password: req.body.password,
      email: req.body.email,
      phone: req.body.phone,
      avat: req.body.avat,
      status: req.body.status,
      role: req.body.role,
    };

    Object.keys(newData).forEach((key) => {
      if (newData[key] === undefined || newData[key] === null) {
        delete newData[key];
      }
    });

    let result = accountModel.update(req.params.id, newData);

    result
      .then(function (value) {
        console.log(value);
        res.json(value);
      })
      .catch(function (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
      });
  }

  delete(req, res) {
    let result = accountModel.delete(req.params.id);
    result
      .then(function (value) {
        res.json(value);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
  login(req, res) {
    const password = req.body.password;
    const email = req.body.email;
    let result = accountModel.findByEmail(email);
    result
      .then(async function (value) {
        const validaPassword = await bcrypt.compare(password, value.password);
        if (validaPassword) {
          req.session.login = true;
          req.session.userEmail = email;
          req.session.userId = value.id;
          req.session.userRole = value.role;
          console.log(req.session);
          res.json({ message: "Login successful", user: value });
        } else {
          res.json({ message: "Incorrect password" });
        }
      })
      .catch(function (error) {
        console.log(error);
        res.json({ message: "Not exist" });
      });
  }
  logout(req, res) {
    try {
      req.session.destroy();
      res.json({ message: "Logout successful" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
  forgotPassword(req, res) {
    const email = req.body.email;
    const otp = accountModel.generateOTP();
    accountModel
      .findByEmail(email)
      .then(function (existing) {
        if (existing) {
          req.session.otpPass = {
            email,
            otp,
            otpExpiration: Date.now() + 5 * 60 * 1000, // Hết hạn sau 5 phút
          };
          sendConfirmationEmail(email, otp);
          return res.json({ message: "Đã gửi thành công" });
        } else {
          return res.json({ message: "Email này chưa có tài khoản" });
        }
      })
      .catch(function (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
      });
  }
  verifPassword(req, res) {
    const { otp, email } = req.body;
    const { otpPass } = req.session;
    if (!otpPass || !otpPass.otp || !otpPass.email) {
      return res
        .status(400)
        .json({ error: "OTP information is missing or invalid" });
    }
    if (otp !== otpPass.otp || email !== otpPass.email) {
      return res.status(400).json({ error: "Invalid OTP or Email" });
    }
    if (Date.now() > otpPass.otpExpiration) {
      return res.status(400).json({ error: "OTP expired" });
    }
    const pass = req.body.password;
    const rePass = req.body.repassword;
    if (pass !== rePass || pass.lenght === 0 || rePass.length === 0)
      return res.json({ error: "Mật khẩu không khớp" });
    var salt = bcrypt.genSaltSync(10);
    var pass_encrypt = bcrypt.hashSync(pass, salt);
    accountModel
      .updateByEmail(email, { password: pass_encrypt })
      .then((user) => {
        res.json({ message: "Forgot successfully", user });
        delete req.session.otpPass;
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
      });
  }
  changePassword(req, res) {
    const { passwordold, passwordnew, rePass } = req.body;
    console.log(req.body);
    if (passwordnew !== rePass)
      return res.status(401).json({ error: "Mật khẩu không khớp" });
    const userId = req.session.userId;

    accountModel
      .findById(userId)
      .then(async (user) => {
        console.log("user", user.password);
        console.log("user", passwordold);
        const validaPassword = await bcrypt.compare(passwordold, user.password);

        if (validaPassword) {
          var salt = bcrypt.genSaltSync(10);
          var pass_encrypt = bcrypt.hashSync(passwordnew, salt);
          accountModel.update(userId, { password: pass_encrypt });
          return res.json({ message: "Thành công" });
        } else {
          return res.status(401).json({ error: "Mật khẩu không đúng" });
        }
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ error: "Interval error" });
      });
  }

  async uploadFile(req, res) {
    try {
      const authClient = await authorize();
      const drive = google.drive({ version: "v3", auth: authClient });

      const fileMetadata = {
        name: req.file.originalname,
        parents: ["1gJZOw4i0gb8y26m9cyJwvAIGf2EsXUpy"],
      };

      const fileStream = new Readable();
      fileStream.push(req.file.buffer);
      fileStream.push(null);

      const media = {
        mimeType: req.file.mimetype,
        body: fileStream,
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, webViewLink",
      });
      const userId = req.session.userId;
      const fileId = response.data.id;
      const webViewLink = response.data.webViewLink;
      accountModel.saveAvatarToDatabase(userId, webViewLink);

      console.log("File uploaded successfully. File ID:", response.data.id);
      res.send("Uploaded file successfully");
    } catch (err) {
      console.error("Error uploading file:", err);
      res.status(500).send("Error uploading file");
    }
  }
}
const authorize = async () => {
  const jwtClient = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    SCOPE
  );
  try {
    await jwtClient.authorize();
    console.log("Kết nối Google OAuth2 thành công!");
    return jwtClient;
  } catch (error) {
    console.error("Lỗi kết nối Google OAuth2:", error);
    throw error;
  }
};
module.exports = new AccountController();
