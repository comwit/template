/** The current Cloud HTTP transport does not support interactive transactions. */
module.exports = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      unsupportedTransaction: 'Manual/interactive db.transaction() is not supported by the current Comwit Cloud HTTP transport. Do not use transaction() in repositories.',
    },
  },
  create(context) {
    const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
    if (!/(^|\/)src\/server\/repository\//.test(filename)) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression') return;
        const name = callee.computed ? callee.property.value : callee.property.name;
        if (name === 'transaction') {
          context.report({ node, messageId: 'unsupportedTransaction' });
        }
      },
    };
  },
};
