export function collectDependencies(requires: Set<string>) {
  return {
    visitor: {
      CallExpression(path: any) {
        const callee = path.get('callee');

        if (callee.isIdentifier() && callee.node.name === 'require') {
          if (!path.scope.hasBinding(callee.node.name)) {
            const arg = path.get('arguments.0');
            const evaluated = arg.evaluate();
            requires.add(evaluated.value);
          }
        }
      },
    },
  };
}
