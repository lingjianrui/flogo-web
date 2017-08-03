import Ajv from 'ajv';

class Validator {

  static validate(data) {
    const ajv = new Ajv({ removeAdditional: true, useDefaults: true, allErrors: true });
    const valid = ajv.validate(getSchema(), data);
    return valid ? null : ajv.errors;
  }

}
export { Validator };

function getSchema() {
  return {
    $schema: 'http://json-schema.org/draft-04/schema#',
    type: 'object',
    required: [
      'name',
      'data',
    ],
    properties: {
      name: {
        type: 'string',
      },
      description: {
        type: 'string',
      },
      ref: {
        type: 'string',
      },
      data: {
        type: 'object',
        default: { },
        properties: {
          flow: {
            $ref: '#/definitions/Flow',
          },
        },
        additionalProperties: false,
      },
    },
    definitions: {
      Flow: {
        title: 'flow',
        type: 'object',
        default: {},
        properties: {
          attributes: {
            type: 'array',
            items: {
              $ref: '#/definitions/Flow/definitions/attribute',
            },
          },
          inputMappings: {
            type: 'array',
            items: {
              $ref: '#/definitions/Flow/definitions/mapping',
            },
          },
          rootTask: {
            default: {},
            title: 'rootTask',
            $ref: '#/definitions/Flow/definitions/rootTask',
          },
          errorHandlerTask: {
            title: 'errorHandlerTask',
            $ref: '#/definitions/Flow/definitions/rootTask',
          },
        },
        required: [
          'rootTask',
        ],
        definitions: {
          attribute: {
            title: 'attribute',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              type: {
                enum: [
                  'string',
                  'integer',
                  'int',
                  'number',
                  'boolean',
                  'object',
                  'array',
                  'params',
                  'any',
                ],
              },
              value: {
                type: [
                  'string',
                  'integer',
                  'number',
                  'boolean',
                  'object',
                  'array',
                  'null',
                ],
              },
            },
            required: [
              'name',
              'type',
              'value',
            ],
          },
          mapping: {
            title: 'mapping',
            type: 'object',
            properties: {
              type: {
                type: 'integer',
              },
              value: {
                type: 'string',
              },
              mapTo: {
                type: 'string',
              },
            },
            required: [
              'type',
              'value',
              'mapTo',
            ],
          },
          link: {
            title: 'link',
            type: 'object',
            properties: {
              name: {
                name: 'string',
              },
              id: {
                type: 'integer',
              },
              from: {
                type: 'integer',
              },
              to: {
                type: 'integer',
              },
              type: {
                type: 'integer',
              },
              value: {
                type: 'string',
              },
            },
            required: [
              'id',
              'from',
              'to',
            ],
          },
          rootTask: {
            title: 'task',
            type: 'object',
            properties: {
              id: {
                type: 'integer',
              },
              type: {
                type: 'integer',
              },
              name: {
                type: 'string',
              },
              description: {
                type: 'string',
              },
              activityRef: {
                type: 'string',
              },
              attributes: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/attribute',
                },
              },
              inputMappings: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/mapping',
                },
              },
              outputMappings: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/mapping',
                },
              },
              tasks: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/task',
                },
              },
              links: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/link',
                },
              },
            },
            required: [
              'id',
            ],
          },
          task: {
            title: 'task',
            type: 'object',
            properties: {
              id: {
                type: 'integer',
              },
              type: {
                type: 'integer',
              },
              name: {
                type: 'string',
              },
              description: {
                type: 'string',
              },
              activityRef: {
                type: 'string',
              },
              attributes: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/attribute',
                },
              },
              inputMappings: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/mapping',
                },
              },
              outputMappings: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/mapping',
                },
              },
              tasks: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/task',
                },
              },
              links: {
                type: 'array',
                items: {
                  $ref: '#/definitions/Flow/definitions/link',
                },
              },
            },
            required: [
              'id',
              'activityRef',
            ],
          },
        },
      },
    },
  };
}