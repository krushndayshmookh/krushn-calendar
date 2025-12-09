const express = require('express');
const router = express.Router();
const { listCategories, createCategory, deleteCategory } = require('../controllers/categoriesController');

router.get('/', listCategories);
router.post('/', createCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
