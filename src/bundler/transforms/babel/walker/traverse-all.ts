import type { Node } from '@babel/types';
import { VISITOR_KEYS } from '@babel/types';

export function traverseAll(node: Node, visitor: (node: Node) => void): void {
  if (!node) {
    return;
  }

  visitor(node);

  for (let key of VISITOR_KEYS[node.type] || []) {
    // @ts-ignore
    let subNode: Node | Array<Node> = node[key];
    if (Array.isArray(subNode)) {
      for (let i = 0; i < subNode.length; i++) {
        traverseAll(subNode[i], visitor);
      }
    } else {
      traverseAll(subNode, visitor);
    }
  }
}
