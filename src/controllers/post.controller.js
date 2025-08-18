import { Post } from "../models/post.models.js";
import { uploadImageToImageKit } from "../utils/imageKit.js";
const createPost = async (req, res) => {
  try {
    const { title, type, description, category, location } = req.body;

    // 1. Validate required fields
    if (!title || !type || !description || !category || !location)
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });

    // 2. Validate "type"
    if (!["lost", "found"].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'lost' or 'found'",
      });
    }
    if (!req.file) {
      console.log("❌ No image uploaded");
      return res.status(400).json({ message: "No image file uploaded" });
    }

    const imageUrl = await uploadImageToImageKit(req.file.path);
    console.log("📷 Image uploaded to Cloudinary:", imageUrl);

    if (!imageUrl) {
      return res.status(500).json({ message: "Image upload failed" });
    }
    // 3. Create the post (attach userId from auth middleware)
    const newPost = new Post({
      userId: req.auth.userId,
      title,
      type,
      description,
      category,
      location,
      image: imageUrl,
    });

    await newPost.save();

    // 4. Success response
    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: newPost,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const { type, category, location } = req.query;

    // Dynamic filter
    let filter = {};
    if (type) filter.type = type.toLowerCase();
    if (category) filter.category = category.toLowerCase();
    if (location) filter.location = { $regex: location, $options: "i" };

    // Fetch posts + populate user details
    const posts = await Post.find(filter)
      .populate("userId", "username email")
      .sort({ createdAt: -1 }); // latest first

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

const updatePost = async (req, res) => {
  try {
    const { id } = req.params; // postId
    const { title, type, description, category, location, imageUrl } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Ownership check
    if (post.userId.toString() !== req.auth.userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Validate type if updated
    if (type && !["lost", "found"].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'lost' or 'found'",
      });
    }

    // Update fields
    post.title = title || post.title;
    post.type = type || post.type;
    post.description = description || post.description;
    post.category = category || post.category;
    post.location = location || post.location;
    post.imageUrl = imageUrl || post.imageUrl;

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: post,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params; // postId

    const post = await Post.findById(id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Ownership check
    if (post.userId.toString() !== req.auth.userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await post.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

export { createPost, getAllPosts, updatePost, deletePost };
