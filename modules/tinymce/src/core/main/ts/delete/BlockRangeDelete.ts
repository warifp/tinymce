/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Node, Range } from '@ephox/dom-globals';
import { Fun, Options } from '@ephox/katamari';
import { Compare, Element, PredicateFind } from '@ephox/sugar';
import Selection from '../api/dom/Selection';
import Editor from '../api/Editor';
import * as CaretFinder from '../caret/CaretFinder';
import CaretPosition from '../caret/CaretPosition';
import * as ElementType from '../dom/ElementType';
import * as DeleteUtils from './DeleteUtils';
import * as MergeBlocks from './MergeBlocks';

const deleteRangeMergeBlocks = (rootNode: Element<Node>, selection: Selection) => {
  const rng = selection.getRng();

  return Options.lift2(
    DeleteUtils.getParentBlock(rootNode, Element.fromDom(rng.startContainer)),
    DeleteUtils.getParentBlock(rootNode, Element.fromDom(rng.endContainer)),
    (block1, block2) => {
      if (Compare.eq(block1, block2) === false) {
        rng.deleteContents();

        MergeBlocks.mergeBlocks(rootNode, true, block1, block2).each((pos) => {
          selection.setRng(pos.toRange());
        });

        return true;
      } else {
        return false;
      }
    }).getOr(false);
};

const isRawNodeInTable = (root: Element<Node>, rawNode: Node) => {
  const node = Element.fromDom(rawNode);
  const isRoot = Fun.curry(Compare.eq, root);
  return PredicateFind.ancestor(node, ElementType.isTableCell, isRoot).isSome();
};

const isSelectionInTable = (root: Element<Node>, rng: Range) =>
  isRawNodeInTable(root, rng.startContainer) || isRawNodeInTable(root, rng.endContainer);

const isEverythingSelected = (root: Element<Node>, rng: Range) => {
  const noPrevious = CaretFinder.prevPosition(root.dom(), CaretPosition.fromRangeStart(rng)).isNone();
  const noNext = CaretFinder.nextPosition(root.dom(), CaretPosition.fromRangeEnd(rng)).isNone();
  return !isSelectionInTable(root, rng) && noPrevious && noNext;
};

const emptyEditor = (editor: Editor) => {
  editor.setContent('');
  editor.selection.setCursorLocation();
  return true;
};

const deleteRange = (editor: Editor) => {
  const rootNode = Element.fromDom(editor.getBody());
  const rng = editor.selection.getRng();
  return isEverythingSelected(rootNode, rng) ? emptyEditor(editor) : deleteRangeMergeBlocks(rootNode, editor.selection);
};

const backspaceDelete = (editor: Editor, _forward: boolean) =>
  editor.selection.isCollapsed() ? false : deleteRange(editor);

export {
  backspaceDelete
};
