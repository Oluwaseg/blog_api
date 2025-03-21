const blogController = require('../../controllers/blogController');
const {
  authenticate,
  checkSessionExpiration,
  authenticatePublic,
} = require('../../middleware/authenticate');
const { blogUpload } = require('../../middleware/image.config');
const {
  homepageCache,
  blogCache,
  categoryCache,
} = require('../../middleware/cache');

const express = require('express');
const router = express.Router();

// Home route for public landing page to get all blogs
router.get('/home', authenticatePublic, homepageCache, async (req, res) => {
  try {
    const blogData = await blogController.getAllBlogs(req, res);
    res.json(blogData);
  } catch (error) {
    console.error('Error getting blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//! Blog endpoints
router.get('/', authenticate, homepageCache, async (req, res) => {
  try {
    await blogController.getAllBlogs(req, res);
  } catch (error) {
    console.error('Error getting blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get(
  '/categories',
  authenticatePublic,
  categoryCache,
  async (req, res) => {
    try {
      let blogsByCategory = await blogController.getBlogsGroupedByCategory();
      res.json({ blogsByCategory });
    } catch (error) {
      console.error('Error getting blogs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

router.post(
  '/create',
  authenticate,
  checkSessionExpiration,
  blogUpload.single('image'),
  blogController.createBlog
);

router.get(
  '/:slug',
  authenticatePublic,
  blogCache,
  blogController.getBlogBySlug
);

router.get(
  '/:slug/edit',
  authenticate,
  checkSessionExpiration,
  blogController.getBlogForEdit
);

router.put(
  '/:slug/edit',
  authenticate,
  checkSessionExpiration,
  blogUpload.single('image'),
  blogController.updateBlog
);

router.delete(
  '/:id',
  authenticate,
  checkSessionExpiration,
  blogController.deleteBlog
);

router.post(
  '/:slug/react',
  authenticate,
  checkSessionExpiration,
  blogController.addReactionToBlog
);

//! Comment endpoints
router.post(
  '/:blogId/comment',
  authenticate,
  checkSessionExpiration,
  blogController.addCommentToBlog
);

router.delete(
  '/comment/:commentId',
  authenticate,
  checkSessionExpiration,
  blogController.deleteComment
);

router.post('/:commentId/edit', blogController.editComment);

router.get('/edit-comment/:commentId', blogController.getEditComment);

router.post(
  '/:slug/comment/:commentId/react',
  authenticate,
  checkSessionExpiration,
  blogController.addReactionToComment
);

//! Reply endpoints
router.post(
  '/comment/:commentId/reply',
  authenticate,
  checkSessionExpiration,
  blogController.replyToComment
);

router.post(
  '/:slug/comment/:commentId/edit-reply/:replyId',
  authenticate,
  checkSessionExpiration,
  blogController.updateReply
);

router.delete(
  '/:slug/comment/:commentId/delete-reply/:replyId',
  authenticate,
  checkSessionExpiration,
  blogController.deleteReply
);

router.get(
  '/:slug/comment/:commentId/edit-reply/:replyId',
  authenticate,
  checkSessionExpiration,
  blogController.getEditReply
);

router.post(
  '/reply/:replyId/react',
  authenticate,
  checkSessionExpiration,
  blogController.addReactionToReply
);

module.exports = router;
