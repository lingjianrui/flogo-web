import {portTaskTypesForLegacyIteratorTasks} from "../../actions/create/port-task-types-for-legacy-iterator-tasks";

const app = require('./samples/legacy-app');

export class ActionsManagerMock {
  static create(appId, actionData) {
    const now = (new Date()).toISOString();
    const action = {
        ...actionData,
        id: `${actionData.id}-processed`,
        createdAt: now,
        updatedAt: null,
        appId,
        app: {
          name: app.name, type: app.type, version: app.version, description: app.description,
          createdAt: now,
          updatedAt: null,
          id: appId
        }
      };

    if (action.data && action.data.flow && action.data.flow.name) {
      action.name = action.data.flow.name;
      delete action.data.flow.name;
    } else if (!action.name) {
      action.name = action.id;
    }

    // TODO: should be done during import in importer.LegacyImporter
    portTaskTypesForLegacyIteratorTasks(actionData);

    return Promise.resolve(action);
  }

  static update(actionId, action) {
    return Promise.resolve({...action});
  }
}
