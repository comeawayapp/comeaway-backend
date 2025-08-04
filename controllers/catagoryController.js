const mongoose = require("mongoose");
const Category = require("../models/catagories");

exports.createCategory = async (req, res) => {
    try {
        const { name, slug } = req.body;
        // Assuming you have user information from JWT token
        const publishedDate = new Date(); // Current date

        // Check if the category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ message: "Category already exists" });
        }

        // Create a new category
        const newCategory = new Category({
            name,
            slug,
            publishedDate
        });

        // Save the category to the database
        await newCategory.save();
        res.status(201).json({ message: "Category created successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error",error:error.message });
    }
};
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).populate('createdBy', 'firstname lastname email');
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateCategory = async (req, res) => {
    try {
        const { name, slug } = req.body;
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Update category details
        category.name = name || category.name;
        category.slug = slug || category.slug;
        category.publishedDate = new Date(); // Update the published date to current date

        await category.save();
        res.status(200).json({ message: "Category updated successfully" ,category});
    } catch (error) {
        res.status(500).json({ message: "Server error",error:error.message });
    }
};
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error:error.message });
    }
};