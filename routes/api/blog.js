const blogController = require('../../controllers/blogController');
const {
  authenticate,
  checkSessionExpiration,
  authenticatePublic,
} = require('../../middleware/authenticate');
const { blogUpload } = require('../../middleware/image.config');

const express = require('express');
const router = express.Router();

// Define CRUD routes
router.get('/', authenticate, async (req, res) => {
  try {
    await blogController.getAllBlogs(req, res);
  } catch (error) {
    console.error('Error getting blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/categories', authenticatePublic, async (req, res) => {
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
  authenticate,
  checkSessionExpiration,
  blogUpload.single('image'),
  blogController.createBlog
);

router.post(
  '/:blogId/comment',
  authenticate,
  checkSessionExpiration,
  blogController.addCommentToBlog
);

router.delete(
  '/:id',
  authenticate,
  checkSessionExpiration,
  blogController.deleteBlog
);

router.delete(
  '/comment/:commentId',
  authenticate,
  checkSessionExpiration,
  blogController.deleteComment
);

router.delete(
  '/:slug/comment/:commentId/delete-reply/:replyId',
  authenticate,
  checkSessionExpiration,
  blogController.deleteReply
);

router.post('/:commentId/edit', blogController.editComment);

router.post(
  '/:slug/comment/:commentId/react',
  authenticate,
  checkSessionExpiration,
  blogController.addReactionToComment
);

router.post(
  '/:slug/react',
  authenticate,
  checkSessionExpiration,
  blogController.addReactionToBlog
);

router.post(
  '/:slug/comment/:commentId/edit-reply/:replyId',
  authenticate,
  checkSessionExpiration,
  blogController.updateReply
);

router.post(
  '/comment/:commentId/reply',
  authenticate,
  checkSessionExpiration,
  blogController.replyToComment
);

router.get('/edit-comment/:commentId', blogController.getEditComment);

router.get('/:slug', authenticatePublic, blogController.getBlogBySlug);

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

router.post(
  '/reply/:replyId/react',
  authenticate,
  checkSessionExpiration,
  blogController.addReactionToReply
);

router.get(
  '/:slug/comment/:commentId/edit-reply/:replyId',
  authenticate,
  checkSessionExpiration,
  blogController.getEditReply
);

module.exports = router;
