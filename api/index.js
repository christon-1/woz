module.exports = async (req, res) => {
  return res.status(404).json({
    error: 'Not found',
    hint: 'Try /health or /v1/chat/completions',
    docs: 'See vercel/README.md'
  });
};
