# Complete validated examples

Replace demonstration content with sourced real findings. These JSON blocks are also parser test fixtures. Example URLs are placeholders and must not be presented as research evidence.

## Small result without unnecessary cards

```json
{
  "version": 1,
  "title": "Deployment check",
  "nodes": [
    {
      "type": "row",
      "gap": 8,
      "children": [
        { "type": "icon", "name": "Check", "size": 20 },
        { "type": "text", "content": "Ready for review", "variant": "title" }
      ]
    },
    {
      "type": "callout",
      "tone": "warning",
      "content": "Production activation has not been performed."
    }
  ]
}
```

## Browsable sourced entity collection

```json
{
  "version": 1,
  "title": "Two places to compare",
  "entities": [
    {
      "id": "garden",
      "kind": "place",
      "title": "Botanical garden",
      "subtitle": "Quiet morning option",
      "description": "Demonstration entity: replace with verified research.",
      "facts": [{ "label": "Example visit duration", "value": "90 minutes" }],
      "sources": [
        {
          "title": "Replace with official visitor information",
          "url": "https://example.com/garden"
        }
      ],
      "related": ["museum"]
    },
    {
      "id": "museum",
      "kind": "place",
      "title": "City museum",
      "description": "Indoor alternative; opening hours need verification.",
      "facts": [{ "label": "Example visit duration", "value": "2 hours" }],
      "sources": [
        {
          "title": "Replace with official collection information",
          "url": "https://example.com/museum"
        }
      ],
      "related": ["garden"]
    }
  ],
  "nodes": [
    {
      "type": "text",
      "content": "Open a place for facts and source links.",
      "variant": "subtitle"
    },
    {
      "type": "carousel",
      "children": [
        {
          "type": "card",
          "title": "Outside",
          "children": [
            { "type": "icon", "name": "Flower2" },
            { "type": "entity-ref", "entityId": "garden" }
          ]
        },
        {
          "type": "card",
          "title": "Inside",
          "children": [
            { "type": "icon", "name": "Landmark" },
            { "type": "entity-ref", "entityId": "museum" }
          ]
        }
      ]
    },
    {
      "type": "button",
      "label": "Open the indoor alternative",
      "variant": "secondary",
      "action": { "type": "open-entity", "entityId": "museum" }
    }
  ]
}
```

## Local quote calculator, no model calls

```json
{
  "version": 1,
  "title": "Illustrative quote",
  "initialState": { "quantity": 4, "rush": false },
  "nodes": [
    {
      "type": "slider",
      "stateKey": "quantity",
      "label": "Quantity",
      "min": 1,
      "max": 20,
      "step": 1
    },
    { "type": "switch", "stateKey": "rush", "label": "Show rush surcharge" },
    {
      "type": "computed",
      "label": "Base total",
      "expr": { "op": "mul", "args": [{ "state": "quantity" }, 25] }
    },
    {
      "type": "conditional",
      "when": { "state": "rush" },
      "children": [
        {
          "type": "computed",
          "label": "Total including surcharge",
          "expr": {
            "op": "add",
            "args": [{ "op": "mul", "args": [{ "state": "quantity" }, 25] }, 15]
          }
        }
      ],
      "elseChildren": [{ "type": "text", "content": "No surcharge selected." }]
    },
    {
      "type": "button",
      "label": "Reset estimate",
      "variant": "ghost",
      "action": { "type": "reset" }
    }
  ]
}
```

## Comparison with tabs and chart

```json
{
  "version": 1,
  "title": "Illustrative comparison",
  "initialState": { "view": "facts" },
  "nodes": [
    {
      "type": "tabs",
      "stateKey": "view",
      "tabs": [
        {
          "id": "facts",
          "label": "Facts",
          "children": [
            {
              "type": "table",
              "columns": [
                { "key": "option", "label": "Option" },
                { "key": "cost", "label": "Example cost" }
              ],
              "rows": [
                { "option": "A", "cost": 20 },
                { "option": "B", "cost": 35 }
              ]
            }
          ]
        },
        {
          "id": "visual",
          "label": "Chart",
          "children": [
            {
              "type": "chart",
              "kind": "bar",
              "data": [
                { "label": "A", "value": 20 },
                { "label": "B", "value": 35 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Supplemental details and an image collection

The URLs here are syntax placeholders, not verified photos or research sources. `tooltip.text` is a plain string; `popover.children` is a node array; `image-group.src` is a URL array.

```json
{
  "version": 1,
  "title": "Illustrative visual reference",
  "nodes": [
    {
      "type": "tooltip",
      "label": "About these images",
      "text": "Replace placeholder URLs with actual relevant images."
    },
    {
      "type": "popover",
      "label": "Read the context",
      "children": [
        {
          "type": "text",
          "content": "Use a popover for optional context, not essential warnings."
        }
      ]
    },
    {
      "type": "image-group",
      "src": [
        "https://example.com/front.jpg",
        "https://example.com/detail.jpg"
      ],
      "alt": "Example reference photographs",
      "label": "Reference views"
    }
  ]
}
```

## Explicit model follow-up, clearly labelled

```json
{
  "version": 1,
  "initialState": { "destination": "garden" },
  "nodes": [
    {
      "type": "select",
      "stateKey": "destination",
      "label": "Planning preference",
      "options": [
        { "label": "Garden visit", "value": "garden" },
        { "label": "Museum visit", "value": "museum" }
      ]
    },
    {
      "type": "button",
      "label": "Ask the assistant to plan this visit",
      "action": {
        "type": "send-message",
        "text": {
          "op": "format",
          "args": [
            "Please plan the selected visit: {0}. Verify current details before recommending it.",
            { "state": "destination" }
          ]
        }
      }
    },
    {
      "type": "text",
      "variant": "caption",
      "content": "The button sends a request to the assistant; it is not a booking."
    }
  ]
}
```

## Dashboard: metrics, a series chart, a sortable table and a flow

Use this shape when the answer is a status page or a comparison with several kinds of evidence. One chart may share a page with a table, but do not print the same numbers twice just to fill space.

```json
{
  "version": 1,
  "title": "Release status",
  "nodes": [
    {
      "type": "text",
      "content": "Three numbers, one trend and the work that is left. The table sorts in the browser."
    },
    {
      "type": "grid",
      "columns": 3,
      "children": [
        {
          "type": "stat",
          "label": "Availability",
          "value": "99,9%",
          "delta": 0.2,
          "deltaLabel": "vs last week",
          "icon": "shield-check"
        },
        {
          "type": "stat",
          "label": "Active users",
          "value": 12480,
          "delta": 12.5,
          "deltaLabel": "this month",
          "icon": "users"
        },
        {
          "type": "stat",
          "label": "Open incidents",
          "value": 4,
          "delta": -18.2,
          "tone": "success",
          "icon": "alert-triangle"
        }
      ]
    },
    {
      "type": "chart",
      "kind": "line",
      "categories": ["Jan", "Feb", "Mar", "Apr"],
      "series": [
        { "label": "Revenue", "values": [62, 74, 68, 91] },
        { "label": "Cost", "values": [41, 44, 47, 52] }
      ],
      "unit": "k €",
      "caption": "Illustrative data, not a financial report."
    },
    {
      "type": "card",
      "title": "Plan",
      "children": [
        {
          "type": "table",
          "sortable": true,
          "filterable": true,
          "filterPlaceholder": "Find a task…",
          "caption": "Sort by any column.",
          "columns": [
            { "key": "task", "label": "Task" },
            {
              "key": "status",
              "label": "Status",
              "format": "status",
              "tones": { "Ready": "success", "In progress": "warning" }
            },
            { "key": "done", "label": "Done", "format": "number" }
          ],
          "rows": [
            { "task": "Design", "status": "Ready", "done": 100 },
            { "task": "Build", "status": "In progress", "done": 65 }
          ]
        },
        { "type": "progress", "value": 65, "label": "Overall", "tone": "success" },
        { "type": "status", "label": "Build green", "tone": "success" }
      ]
    },
    {
      "type": "diagram",
      "direction": "vertical",
      "caption": "Request path",
      "steps": [
        { "id": "ask", "label": "Request" },
        {
          "id": "model",
          "label": "Model",
          "detail": "picks structure",
          "connector": "spec"
        },
        {
          "id": "render",
          "label": "Renderer",
          "detail": "validates and mounts",
          "connector": "RichSpec"
        }
      ]
    }
  ]
}
```
