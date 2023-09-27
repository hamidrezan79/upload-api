const express = require("express");
const router = express.Router();
const test_routes = require("./test");
// …
router.use("/about",test_routes);

module.exports = router;
