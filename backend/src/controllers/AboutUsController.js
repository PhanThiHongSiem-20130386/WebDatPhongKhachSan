const aboutusModel = require("../config/db/models/AboutUs");
class AboutUsController {
  get(req, res) {
    let result = aboutusModel.get_all();
    result
      .then(function (value) {
        console.log(value);
        res.json(value);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
  getAboutStatus(req, res) {
    let result = aboutusModel.getAboutStatus();
    result
      .then(function (value) {
        console.log(value);
        res.json(value[0]);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
  find(req, res) {
    let result = aboutusModel.find(req.params.id);
    result
      .then(function (value) {
        console.log(value);
        res.json(value);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
  create(req, res) {
    const data = {
      slogan1: req.body.slogan1,
      slogan2: req.body.slogan2,
      content: req.body.content,
      img: req.body.img,
      status: 0,
    };
    let result = aboutusModel.create(data);
    result
      .then(function (value) {
        console.log(value);
        res.json(value);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
  update(req, res) {
    const data = {
      information: req.body.information,
      status: req.body.status,
    };
    let result = aboutusModel.update(req.params.id, data);
    result
      .then(function (value) {
        // console.log(value);
        res.json(value);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
  delete(req, res) {
    let result = aboutusModel.delete(req.params.id);
    result
      .then(function (value) {
        console.log(value);
        res.json(value);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
}

module.exports = new AboutUsController();
