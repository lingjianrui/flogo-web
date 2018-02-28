import { expect } from 'chai';
import { ActionsImporter } from './actions-importer';

describe('importer.device.ActionsImporter', () => {
  const mockActivityRef = 'github.com/TIBCOSoftware/flogo-contrib/device/activity/setpin';
  const activitySchema = getActivitySchemaMock();
  const deviceActionsImporter = new ActionsImporter({}, [activitySchema]);

  describe('#formatAction', () => {
    let mockTask;
    let mockLink;
    let mockAction;
    beforeEach(function () {
      mockLink = { id: 1, from: 2, to: 3, type: 0 };
      mockTask = {
        id: 2,
        name: 'Set Pin',
        description: 'Simple Device Set Pin Activity',
        type: 1,
        activityRef: mockActivityRef,
      };
      mockAction = {
        id: 'a',
        name: 'my action',
        data: {
          flow: {
            links: [mockLink],
            tasks: [mockTask],
          },
        },
      };
    });

    it('should account for empty actions', () => {
      let formattedAction = null;
      expect(() => {
        formattedAction = deviceActionsImporter
          .formatAction({ id: 'a', name: 'my action' });
      }).to.not.throw();
      expect(formattedAction)
        .to.deep.include({ id: 'a', name: 'my action' })
        .and.to.have.key('data');
    });

    it('should set the id as name if name is not provided', () => {
      const formattedAction = deviceActionsImporter
        .formatAction({ id: 'myCoolAction', data: {} });
      expect(formattedAction.name).to.equal('myCoolAction');
    });

    it('should convert tasks and links into a root task', () => {
      const actionToTest = {
        ...mockAction,
        data: {
          flow: {
            ...mockAction.data.flow,
            tasks: [
              { ...mockTask },
              { ...mockTask, id: 3 },
            ],
          },
        },
      };
      const formattedAction = deviceActionsImporter.formatAction(actionToTest);
      expect(formattedAction)
        .to.deep.include({ id: 'a', name: 'my action' })
        .and.to.not.have.keys('tasks', 'links');
      expect(formattedAction)
        .to.have.a.nested.property('data.flow.rootTask')
        .that.deep.includes({ id: 1, type: 1 });

      const rootTask = formattedAction.data.flow.rootTask;
      expect(rootTask.links).to.be.an('array').and.to.deep.include(mockLink);
      expect(rootTask.tasks).to.be.an('array').of.length(2);
      const taskIds = rootTask.tasks.map(task => task.id);
      expect(taskIds).to.have.members([2, 3]);
    });
  });

  describe('#mapTask', () => {
    const context = { taskProps: null, mappedTask: null };
    before(() => {
      context.taskProps = {
        id: 2,
        name: 'Set Pin',
        description: 'Simple Device Set Pin Activity',
        type: 1,
        activityRef: mockActivityRef,
      };
      context.mappedTask = deviceActionsImporter.mapTask({
        ...context.taskProps,
        attributes: {
          pin: 25,
          digital: true,
        },
      });
    });

    it('should correctly map a task to the internal model', () => {
      expect(context.mappedTask).to.deep.include(context.taskProps);
      expect(context.mappedTask.attributes).to.be.an('array').with.length(3);
    });

    it('should correctly match the task attributes with its corresponding activity schema', () => {
      expect(context.mappedTask.attributes)
        .to.deep.include({ name: 'pin', type: 'int', value: 25 })
        .and.to.deep.include({ name: 'digital', type: 'boolean', value: true });
    });

    it('should add those attributes defined in the activity schema but not provided by the activity', () => {
      expect(context.mappedTask.attributes)
        .to.deep.include({ name: 'value', type: 'int', value: '' });
    });
  });

  function getActivitySchemaMock() {
    return {
      name: 'tibco-device-setpin',
      type: 'flogo:device:activity',
      ref: 'github.com/TIBCOSoftware/flogo-contrib/device/activity/setpin',
      version: '0.0.1',
      title: 'Set Pin',
      description: 'Simple Device Set Pin Activity',
      settings: [
        {
          name: 'pin',
          type: 'int',
        },
        {
          name: 'digital',
          type: 'boolean',
        },
        {
          name: 'value',
          type: 'int',
        },
      ],
      device_support: [
        {
          framework: 'arduino',
          template: 'setpin.ino.tmpl',
          devices: [],
        },
      ],
    };
  }

});
