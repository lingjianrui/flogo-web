import { groupBy } from 'lodash';
import { Injectable } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

import { NodeType } from '@flogo-web/lib-client/core';

import { TaskTile, Tile, TileType } from '../interfaces';
import { DropActionData, TilesGroupedByZone } from './interface';

@Injectable()
export class DragTileService {
  groupTilesByZone(allTiles: Tile[]): TilesGroupedByZone {
    const { preDropZone, dropZone, postDropZone } = groupBy(allTiles, (tile: Tile) => {
      switch (tile.type) {
        case TileType.Padding:
          return 'preDropZone';
        case TileType.Task: {
          const { task } = tile as TaskTile;
          if (task.type === NodeType.Branch) {
            return 'preDropZone';
          } else if (task?.features?.canHaveChildren) {
            return 'dropZone';
          }
          return 'postDropZone';
        }
        case TileType.Insert:
        case TileType.Placeholder:
          return 'postDropZone';
      }
    });
    return {
      preDropZone: preDropZone || [],
      dropZone: dropZone || [],
      postDropZone: postDropZone || [],
    };
  }

  prepareDropActionData(
    dropEvent: CdkDragDrop<Tile[]>,
    getBranchId?: () => string
  ): DropActionData {
    const {
      previousIndex,
      currentIndex,
      item,
      container,
      previousContainer,
      isPointerOverContainer,
    } = dropEvent;

    if (!isPointerOverContainer) {
      return;
    }

    if (previousContainer === container && previousIndex === currentIndex) {
      /* Returning if the item is dropped in it's original place */
      return;
    }

    const taskTilesInContainer = container.getSortedItems();
    let parentId: string = null;

    if (currentIndex > 0) {
      if (previousContainer === container && currentIndex > previousIndex) {
        parentId = taskTilesInContainer[currentIndex]?.data;
      } else {
        parentId = taskTilesInContainer[currentIndex - 1]?.data;
      }
    } else if (getBranchId) {
      /* When the tile is dropped at the first place of a non-zero indexed row then
         the parent of the tile will be the branch tile in this row and calculated
         by consumer */
      parentId = getBranchId();
    }
    return {
      itemId: item.data,
      parentId,
    };
  }

  getAllRowsParentTiles(tileMatrix, rowIndexes) {
    const rowParentList = [];
    const allRowsParentsList = [];
    tileMatrix.forEach(row => {
      const branchTask = row.find(tile => {
        return tile?.task?.type === NodeType.Branch;
      });
      if (branchTask) {
        const rowParent = branchTask.task.parents[0];
        rowParentList.push(rowParent);
      } else {
        rowParentList.push(null);
      }
    });
    rowParentList.forEach(parentTile => {
      allRowsParentsList.push(this.getRowParents(parentTile, rowParentList, rowIndexes));
    });
    return allRowsParentsList;
  }

  private getRowParents(parentTile, rowsParent, rowIndexes) {
    if (!parentTile) {
      return null;
    }
    const allParentTiles = [parentTile];
    while (parentTile) {
      parentTile = this.getRowParent(parentTile, rowsParent, rowIndexes);
      if (parentTile) {
        allParentTiles.push(parentTile);
      }
    }
    return allParentTiles;
  }

  private getRowParent(parentTile, rowsParent, rowIndexes) {
    const parentRowIndex = rowIndexes.get(parentTile);
    return rowsParent[parentRowIndex];
  }
}
