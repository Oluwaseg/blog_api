const blogController = require('../../controllers/blogController');
const {
  authenticateToken,
  checkSessionExpiration,
  authenticateTokenPublic,
} = require('../../middleware/authenticate');

const { blogUpload } = require('../../middleware/image.config');

const express = require('express');
const router = express.Router();

// Define CRUD routes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const blogsData = await blogController.getAllBlogs();
    res.json(blogsData);
  } catch (error) {
    console.error('Error getting blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/categories', authenticateTokenPublic, async (req, res) => {
  try {
    let blogsByCategory = await blogController.getBlogsGroupedByCategory();
    res.json({ blogsByCategory });
  } catch (error) {
    console.error('Error getting blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post(
  '/create',
  authenticateToken,
  checkSessionExpiration,
  blogUpload.single('image'),
  blogController.createBlog
);

router.post(
  '/:blogId/comment',
  authenticateToken,
  checkSessionExpiration,
  blogController.addCommentToBlog
);

router.delete(
  '/:id',
  authenticateToken,
  checkSessionExpiration,
  blogController.deleteBlog
);

router.delete(
  '/comment/:commentId',
  authenticateToken,
  checkSessionExpiration,
  blogController.deleteComment
);

router.delete(
  '/:slug/comment/:commentId/delete-reply/:replyId',
  authenticateToken,
  checkSessionExpiration,
  blogController.deleteReply
);

router.post('/:commentId/edit', blogController.editComment);

router.post(
  '/:slug/comment/:commentId/react',
  authenticateToken,
  checkSessionExpiration,
  blogController.addReactionToComment
);

router.post(
  '/:slug/react',
  authenticateToken,
  checkSessionExpiration,
  blogController.addReactionToBlog
);

router.post(
  '/:slug/comment/:commentId/edit-reply/:replyId',
  authenticateToken,
  checkSessionExpiration,
  blogController.updateReply
);

router.post(
  '/comment/:commentId/reply',
  authenticateToken,
  checkSessionExpiration,
  blogController.replyToComment
);

router.get('/edit-comment/:commentId', blogController.getEditComment);

router.get('/:slug', authenticateTokenPublic, blogController.getBlogBySlug);

router.get(
  '/:slug/edit',
  authenticateToken,
  checkSessionExpiration,
  blogController.getBlogForEdit
);

router.put(
  '/:slug/edit',
  authenticateToken,
  checkSessionExpiration,
  blogController.updateBlog
);

module.exports = router;
