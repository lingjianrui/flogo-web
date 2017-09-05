import {FLOGO_TASK_TYPE} from '../../constants';
import {flogoIDDecode} from '../../utils';

export abstract class AbstractProfileUtilityService {
  abstract generateTaskID(items?: any, currentTask?: any);

  getMaxCount(items: any, parseInput?) {
    let maxCount;
    const ids = _.keys( items );
    const startPoint = 2; // taskID 1 is reserved for the rootTask

    const taskIDs = _.map( _.filter( ids, ( id: string ) => {
      const type = items[ id ].type;
      return type === FLOGO_TASK_TYPE.TASK || type === FLOGO_TASK_TYPE.TASK_ROOT;
    } ), ( id: string ) => {
      // if parseInput callback is provided then parse the decoded task ID to get the number string
      const numberString = parseInput ? parseInput(flogoIDDecode( id )) : flogoIDDecode( id );
      // Convert the numberString to number
      return _[ 'toNumber' ](numberString);
    } );

    const currentMax = _.max( taskIDs );

    if ( currentMax ) {
      maxCount = '' + ( currentMax + 1);
    } else {
      maxCount = '' + startPoint;
    }
    return maxCount;
  }
}
