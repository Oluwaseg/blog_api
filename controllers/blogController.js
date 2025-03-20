const { Blog, Comment, User } = require('../models/model');
const { JSDOM } = require('jsdom');
const dompurify = require('dompurify');
const { window } = new JSDOM('');
const { sanitize } = dompurify(window);
const cloudinary = require('cloudinary').v2;

// ! BLOG CRUD LOGIC

// Get all blogs
const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .populate('author', 'name username image')
      .exec();

    let randomBlogByCategory = {};
    try {
      randomBlogByCategory = await getRandomBlogsByCategory();
    } catch (error) {
      console.error('Error fetching random blogs:', error);
    }

    let blogsByCategory = {};
    try {
      blogsByCategory = await getBlogsGroupedByCategory();
    } catch (error) {
      console.error('Error fetching blogs by category:', error);
    }

    return res.status(200).json({
      success: true,
      data: {
        blogs,
        randomBlogByCategory,
        blogsByCategory,
      },
    });
  } catch (error) {
    console.error('Error getting blogs:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const getBlogsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const blogs = await Blog.find({ category }).populate(
      'author',
      'name username image'
    );

    return res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    console.error(`Error getting ${req.params.category} blogs:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const getBlogsGroupedByCategory = async () => {
  try {
    const categories = await Blog.distinct('category');
    const blogsByCategory = {};

    for (const category of categories) {
      const blogs = await Blog.find({ category }).populate(
        'author',
        'name username image'
      );
      blogsByCategory[category] = blogs;
    }

    return blogsByCategory;
  } catch (error) {
    console.error('Error getting blogs by category:', error);
    throw error;
  }
};

const getRandomBlogsByCategory = async (currentCategory) => {
  try {
    const categories = await Blog.distinct('category');
    const blogsByCategory = {};

    // Array to keep track of selected categories
    const selectedCategories = [];

    for (const category of categories) {
      // If the current category is provided and matches the loop category,
      // or if the category has already been selected, skip this iteration
      if (
        (currentCategory && category === currentCategory) ||
        selectedCategories.includes(category)
      ) {
        continue;
      }

      let pipeline = [{ $match: { category } }, { $sample: { size: 1 } }];

      const blogs = await Blog.aggregate(pipeline);

      for (let blog of blogs) {
        blog = await Blog.populate(blog, {
          path: 'author',
          select: 'name username image',
        });
      }

      blogsByCategory[category] = blogs;

      // Add the selected category to the array
      selectedCategories.push(category);
    }

    return blogsByCategory;
  } catch (error) {
    console.error('Error getting random blogs by category:', error);
    throw error; // Rethrow the error to handle it elsewhere if needed
  }
};

const createBlog = async (req, res) => {
  try {
    const { title, description, content, category, tags } = req.body;
    const author = req.user._id;

    if (!title || !description || !content || !category || !tags) {
      return res.status(400).json({
        success: false,
        message:
          'Title, description, content, category, and tags are required.',
      });
    }

    const sanitizedContent = sanitize(content);

    let image;
    if (req.file) {
      // Check if file is uploaded
      image = req.file.path; // This should be the path of the uploaded image
    }

    const tagArray = tags.split(',').map((tag) => tag.trim());

    const blog = new Blog({
      title,
      description,
      content: sanitizedContent,
      author,
      image: image ? image : undefined,
      category,
      tags: tagArray,
    });

    await blog.save();

    return res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog,
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const formatTimeDifference = (createdAt) => {
  const currentTime = new Date();
  const timeDifference = currentTime - createdAt;

  // Convert milliseconds to hours
  const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));

  if (hoursDifference < 1) {
    // If less than an hour, show minutes
    const minutesDifference = Math.floor(timeDifference / (1000 * 60));
    return `${minutesDifference} minutes ago`;
  } else {
    // Otherwise, show hours
    return `${hoursDifference} hours ago`;
  }
};

// Get a blog by ID
const displayedReplies = 3;
const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate('author', 'name username image')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name image',
        },
      })
      .populate({
        path: 'comments',
        populate: {
          path: 'replies',
          populate: {
            path: 'author',
            select: 'name image',
          },
        },
      });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog Not Found',
      });
    }

    const relatedBlog = await Blog.find({
      category: blog.category,
      _id: { $ne: blog._id },
    })
      .populate('author', 'name image')
      .limit(3);

    const randomBlogByCategory = await getRandomBlogsByCategory();

    const commentCount = blog.comments.length;
    const isOwner =
      req.user && req.user._id.toString() === blog.author._id.toString();

    // Format timestamps for comments and replies
    const formattedBlog = {
      ...blog.toObject(),
      comments: blog.comments.map((comment) => ({
        ...comment.toObject(),
        formattedTime: formatTimeDifference(comment.createdAt),
        replies: comment.replies.map((reply) => ({
          ...reply.toObject(),
          formattedTime: formatTimeDifference(reply.createdAt),
        })),
      })),
    };

    return res.status(200).json({
      success: true,
      data: {
        blog: formattedBlog,
        isOwner,
        commentCount,
        relatedBlog,
        randomBlogByCategory,
        displayedReplies,
      },
    });
  } catch (error) {
    console.error('Error getting blog by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const getBlogForEdit = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog Not Found',
      });
    }

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error('Error getting blog for edit:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { title, description, content, category, tags, removeImage } =
      req.body;
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: 'Blog Not Found' });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (content) updateData.content = sanitize(content);
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags.split(',').map((tag) => tag.trim());

    // Remove old image if requested or if a new one is uploaded
    if (removeImage === 'true' || req.file) {
      if (blog.image) {
        // Extract public ID from Cloudinary URL
        const publicId = blog.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(
          `blog-folder/blog-images/${publicId}`
        );
        updateData.image = req.file ? req.file.path : '';
      }
    }

    // Set new image if uploaded
    if (req.file) {
      updateData.image = req.file.path;
    }

    const updatedBlog = await Blog.findOneAndUpdate(
      { slug: req.params.slug },
      updateData,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: updatedBlog,
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog Not Found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const addReactionToBlog = async (req, res) => {
  try {
    const { reactionType } = req.body;
    const { slug } = req.params;
    const userId = req.user._id;

    // Find the blog by slug
    const blog = await Blog.findOne({ slug });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Check if the user has already reacted with the opposite reactionType
    const oppositeReactionType =
      reactionType === 'likes' ? 'dislikes' : 'likes';
    if (blog.reactions[oppositeReactionType].includes(userId)) {
      blog.reactions[oppositeReactionType] = blog.reactions[
        oppositeReactionType
      ].filter((id) => id.toString() !== userId.toString());
    }

    // Check if the user has already reacted with the same reactionType
    if (blog.reactions[reactionType].includes(userId)) {
      // If the user has already reacted, remove their reaction
      blog.reactions[reactionType] = blog.reactions[reactionType].filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // If the user hasn't reacted, add their reaction
      blog.reactions[reactionType].push(userId);
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      data: {
        userLiked: blog.reactions.likes.includes(userId),
        userDisliked: blog.reactions.dislikes.includes(userId),
        likesCount: blog.reactions.likes.length,
        dislikesCount: blog.reactions.dislikes.length,
      },
    });
  } catch (error) {
    console.error('Error adding reaction to blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

//! COMMENT CRUD CODE BLOCK

const addCommentToBlog = async (req, res) => {
  try {
    const { content } = req.body;
    const { blogId } = req.params;
    const authorId = req.user._id;

    // Fetch the full author information
    const author = await User.findById(authorId);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Author not found',
      });
    }

    const comment = new Comment({
      content,
      author: {
        _id: author._id,
        name: author.name,
        image: author.image,
      },
    });

    await comment.save();

    const blog = await Blog.findByIdAndUpdate(
      blogId,
      { $push: { comments: comment._id } },
      { new: true }
    ).populate({
      path: 'comments',
      populate: {
        path: 'author',
        select: 'name image',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment,
        blog,
      },
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const editComment = async (req, res) => {
  try {
    const { commentId } = req.params; // Retrieve the comment ID from request parameters
    const { content } = req.body; // Retrieve the updated content from request body

    // Find the comment to update
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment Not Found',
      });
    }

    // Update the comment content
    comment.content = content;
    await comment.save();

    // Fetch the associated blog post
    const blog = await Blog.findOne({ comments: commentId });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: {
        comment,
        blogSlug: blog.slug,
      },
    });
  } catch (error) {
    console.error('Error editing comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const getEditComment = async (req, res) => {
  try {
    // Retrieve the comment from the database or wherever it's stored
    const commentId = req.params.commentId;
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    const blog = await Blog.findOne({ comments: commentId });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        comment,
        blog,
      },
    });
  } catch (error) {
    console.error('Error getting comment for edit:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    // Find and delete the comment by its ID
    await Comment.findByIdAndDelete(commentId);

    // Fetch the associated blog post
    const blog = await Blog.findOneAndUpdate(
      { comments: commentId },
      { $pull: { comments: commentId } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
      data: {
        blogSlug: blog.slug,
      },
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const addReactionToComment = async (req, res) => {
  try {
    const { reactionType } = req.body;
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check if the user has already reacted with the opposite reactionType
    const oppositeReactionType =
      reactionType === 'likes' ? 'dislikes' : 'likes';
    if (comment.reactions[oppositeReactionType].includes(userId)) {
      // Remove the user from the opposite reaction array
      comment.reactions[oppositeReactionType] = comment.reactions[
        oppositeReactionType
      ].filter((id) => id.toString() !== userId.toString());
    }

    // Check if the user has already reacted with the same reactionType
    if (comment.reactions[reactionType].includes(userId)) {
      // If the user has already reacted, remove their reaction
      comment.reactions[reactionType] = comment.reactions[reactionType].filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // If the user hasn't reacted, add their reaction
      comment.reactions[reactionType].push(userId);
    }

    await comment.save();

    return res.status(200).json({
      success: true,
      data: {
        commentId: commentId,
        likedComment: comment.reactions.likes.includes(userId),
        dislikedComment: comment.reactions.dislikes.includes(userId),
        likesComment: comment.reactions.likes.length,
        dislikesComment: comment.reactions.dislikes.length,
      },
    });
  } catch (error) {
    console.error('Error adding reaction to comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

//! REPLY COMMENT BLOCK

const replyToComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { commentId } = req.params;
    const authorId = req.user._id;

    // Fetch the full author information
    const author = await User.findById(authorId);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Author not found',
      });
    }

    const reply = new Comment({
      content,
      author: {
        _id: author._id,
        name: author.name,
        image: author.image,
      },
    });

    await reply.save();

    // Find the parent comment and push the reply to its replies array
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found',
      });
    }

    parentComment.replies.push(reply._id);
    await parentComment.save();

    // Find the parent blog associated with the comment
    const parentBlog = await Blog.findOne({ comments: commentId });
    if (!parentBlog) {
      return res.status(404).json({
        success: false,
        message: 'Parent blog not found',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: {
        reply,
        parentComment,
        blogSlug: parentBlog.slug,
      },
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const getEditReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const reply = await Comment.findById(replyId);
    const comment = await Comment.findById(commentId); // Retrieve the comment object
    const blog = await Blog.findOne({ comments: commentId });

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found',
      });
    }

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        reply,
        comment,
        blog,
      },
    });
  } catch (error) {
    console.error('Error getting reply for edit:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const updateReply = async (req, res) => {
  try {
    const { replyId } = req.params; // Extract the reply ID from the request parameters
    const { content } = req.body; // Extract the updated content from the request body

    console.log('Reply ID:', replyId);
    console.log('Updated content:', content);

    // Find the reply in the database by its ID
    const reply = await Comment.findById(replyId);

    console.log('Reply found:', reply);

    // Check if the reply exists
    if (!reply) {
      // If the reply doesn't exist, return error
      console.log('Reply not found');
      return res.status(404).json({
        success: false,
        message: 'Reply not found',
      });
    }

    // Check if the authenticated user is the author of the reply
    if (req.user._id.toString() !== reply.author._id.toString()) {
      // If the user is not the author, return error
      console.log('User not authorized to edit this reply');
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this reply',
      });
    }

    // Update the content of the reply
    reply.content = content;

    console.log('Updated reply:', reply);

    // Save the updated reply to the database
    await reply.save();

    // Find the blog for the response
    const parentComment = await Comment.findOne({ replies: replyId });
    const blog = await Blog.findOne({ comments: parentComment._id });

    return res.status(200).json({
      success: true,
      message: 'Reply updated successfully',
      data: {
        reply,
        blogSlug: blog.slug,
      },
    });
  } catch (error) {
    // Handle any errors that occur during the update process
    console.error('Error updating reply:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const deleteReply = async (req, res) => {
  try {
    const { replyId, commentId } = req.params;

    // Find and delete the reply by its ID
    await Comment.findByIdAndDelete(replyId);

    // Update the parent comment to remove the reply reference
    await Comment.findByIdAndUpdate(commentId, { $pull: { replies: replyId } });

    // Find the blog for the response
    const blog = await Blog.findOne({ comments: commentId });

    return res.status(200).json({
      success: true,
      message: 'Reply deleted successfully',
      data: {
        blogSlug: blog.slug,
      },
    });
  } catch (error) {
    console.error('Error deleting reply:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

// Controller function to add a reaction to a reply
const addReactionToReply = async (req, res) => {
  try {
    const { reactionType } = req.body;
    const { replyId } = req.params;
    const userId = req.user._id;

    const reply = await Comment.findById(replyId);

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found',
      });
    }

    // Check if the user has already reacted with the opposite reactionType
    const oppositeReactionType =
      reactionType === 'likes' ? 'dislikes' : 'likes';
    if (reply.reactions[oppositeReactionType].includes(userId)) {
      reply.reactions[oppositeReactionType] = reply.reactions[
        oppositeReactionType
      ].filter((id) => id.toString() !== userId.toString());
    }

    // Check if the user has already reacted with the same reactionType
    if (reply.reactions[reactionType].includes(userId)) {
      // If the user has already reacted, remove their reaction
      reply.reactions[reactionType] = reply.reactions[reactionType].filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // If the user hasn't reacted, add their reaction
      reply.reactions[reactionType].push(userId);
    }

    await reply.save();

    // Find the parent comment and blog for the response
    const parentComment = await Comment.findOne({ replies: replyId });
    const blog = await Blog.findOne({ comments: parentComment._id });

    return res.status(200).json({
      success: true,
      data: {
        replyId,
        likedReply: reply.reactions.likes.includes(userId),
        dislikedReply: reply.reactions.dislikes.includes(userId),
        likesReply: reply.reactions.likes.length,
        dislikesReply: reply.reactions.dislikes.length,
        blogSlug: blog.slug,
      },
    });
  } catch (error) {
    console.error('Error adding reaction to reply:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

module.exports = {
  getAllBlogs,
  createBlog,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  getBlogForEdit,
  addCommentToBlog,
  editComment,
  deleteComment,
  getEditComment,
  addReactionToComment,
  addReactionToBlog,
  replyToComment,
  getEditReply,
  updateReply,
  deleteReply,
  addReactionToReply,
  getBlogsByCategory,
  getRandomBlogsByCategory,
  getBlogsGroupedByCategory,
};
