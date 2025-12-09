const Category = require('../models/Category');
const connectDB = require('../config/db');

const ensureDB = async () => {
    await connectDB();
};

const listCategories = async (req, res) => {
    try {
        await ensureDB();
        const categories = await Category.find({ userId: req.user._id });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createCategory = async (req, res) => {
    try {
        await ensureDB();
        const { name, color } = req.body;
        const category = await Category.create({
            name,
            color,
            userId: req.user._id
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        await ensureDB();
        await Category.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { listCategories, createCategory, deleteCategory };
