const S2Model = require("../../common/models/S2");

module.exports = {
  createS2: (req, res) => {
    const { body } = req;

    S2Model.createS2(body)
      .then((s2) => {
        return res.status(200).json({
          status: true,
          data: s2.toJSON(),
        });
      })
      .catch((err) => {
        return res.status(500).json({
          status: false,
          error: err,
        });
      });
  },
};
