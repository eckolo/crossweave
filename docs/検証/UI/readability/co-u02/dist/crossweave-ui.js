/* Lucide 1.8.0; ISC and Feather notices in lucide.LICENSE. Generated subset. */
(()=>{const factories=[function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const replaceElement=get(1).default;

const createIcons = ({
  icons = {},
  nameAttr = "data-lucide",
  attrs = {},
  root = document,
  inTemplates
} = {}) => {
  if (!Object.values(icons).length) {
    throw new Error(
      "Please provide an icons object.\nIf you want to use all the icons you can import it like:\n `import { createIcons, icons } from 'lucide';\nlucide.createIcons({icons});`"
    );
  }
  if (typeof root === "undefined") {
    throw new Error("`createIcons()` only works in a browser environment.");
  }
  const elementsToReplace = Array.from(root.querySelectorAll(`[${nameAttr}]`));
  elementsToReplace.forEach((element) => replaceElement(element, { nameAttr, icons, attrs }));
  if (inTemplates) {
    const templates = Array.from(root.querySelectorAll("template"));
    templates.forEach(
      (template) => createIcons({
        icons,
        nameAttr,
        attrs,
        root: template.content,
        inTemplates
      })
    );
  }
  if (nameAttr === "data-lucide") {
    const deprecatedElements = root.querySelectorAll("[icon-name]");
    if (deprecatedElements.length > 0) {
      console.warn(
        "[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide"
      );
      Array.from(deprecatedElements).forEach(
        (element) => replaceElement(element, { nameAttr: "icon-name", icons, attrs })
      );
    }
  }
};




return {"createIcons":createIcons};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const createElement=get(2).default;
const defaultAttributes=get(3).default;
const { hasA11yProp }=get(4);
const { mergeClasses }=get(5);
const { toPascalCase }=get(6);

const getAttrs = (element) => Array.from(element.attributes).reduce((attrs, attr) => {
  attrs[attr.name] = attr.value;
  return attrs;
}, {});
const getClassNames = (attrs) => {
  if (typeof attrs === "string") return attrs;
  if (!attrs || !attrs.class) return "";
  if (attrs.class && typeof attrs.class === "string") {
    return attrs.class.split(" ");
  }
  if (attrs.class && Array.isArray(attrs.class)) {
    return attrs.class;
  }
  return "";
};
const replaceElement = (element, { nameAttr, icons, attrs }) => {
  const iconName = element.getAttribute(nameAttr);
  if (iconName == null) return;
  const ComponentName = toPascalCase(iconName);
  const iconNode = icons[ComponentName];
  if (!iconNode) {
    return console.warn(
      `${element.outerHTML} icon name was not found in the provided icons object.`
    );
  }
  const elementAttrs = getAttrs(element);
  const ariaProps = hasA11yProp(elementAttrs) ? {} : { "aria-hidden": "true" };
  const iconAttrs = {
    ...defaultAttributes,
    "data-lucide": iconName,
    ...ariaProps,
    ...attrs,
    ...elementAttrs
  };
  const elementClassNames = getClassNames(elementAttrs);
  const className = getClassNames(attrs);
  const classNames = mergeClasses(
    "lucide",
    `lucide-${iconName}`,
    ...elementClassNames,
    ...className
  );
  if (classNames) {
    Object.assign(iconAttrs, {
      class: classNames
    });
  }
  const svgElement = createElement(iconNode, iconAttrs);
  return element.parentNode?.replaceChild(svgElement, element);
};




return {"default":replaceElement,"getAttrs":getAttrs,"getClassNames":getClassNames};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const defaultAttributes=get(3).default;

const createSVGElement = ([tag, attrs, children]) => {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.keys(attrs).forEach((name) => {
    element.setAttribute(name, String(attrs[name]));
  });
  if (children?.length) {
    children.forEach((child) => {
      const childElement = createSVGElement(child);
      element.appendChild(childElement);
    });
  }
  return element;
};
const createElement = (iconNode, customAttrs = {}) => {
  const tag = "svg";
  const attrs = {
    ...defaultAttributes,
    ...customAttrs
  };
  return createSVGElement([tag, attrs, iconNode]);
};




return {"default":createElement};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};




return {"default":defaultAttributes};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};




return {"hasA11yProp":hasA11yProp};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();




return {"mergeClasses":mergeClasses};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const { toCamelCase }=get(7);

const toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};




return {"toPascalCase":toPascalCase};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);




return {"toCamelCase":toCamelCase};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Activity = [
  [
    "path",
    {
      d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
    }
  ]
];




return {"default":Activity};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const ArrowLeft = [
  ["path", { d: "m12 19-7-7 7-7" }],
  ["path", { d: "M19 12H5" }]
];




return {"default":ArrowLeft};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const ArrowRight = [
  ["path", { d: "M5 12h14" }],
  ["path", { d: "m12 5 7 7-7 7" }]
];




return {"default":ArrowRight};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const ArrowUpRight = [
  ["path", { d: "M7 7h10v10" }],
  ["path", { d: "M7 17 17 7" }]
];




return {"default":ArrowUpRight};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const BookOpen = [
  ["path", { d: "M12 7v14" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
    }
  ]
];




return {"default":BookOpen};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const ChevronLeft = [["path", { d: "m15 18-6-6 6-6" }]];




return {"default":ChevronLeft};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const ChevronRight = [["path", { d: "m9 18 6-6-6-6" }]];




return {"default":ChevronRight};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Crosshair = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["line", { x1: "22", x2: "18", y1: "12", y2: "12" }],
  ["line", { x1: "6", x2: "2", y1: "12", y2: "12" }],
  ["line", { x1: "12", x2: "12", y1: "6", y2: "2" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "18" }]
];




return {"default":Crosshair};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Flag = [
  [
    "path",
    {
      d: "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"
    }
  ]
];




return {"default":Flag};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Heart = [
  [
    "path",
    {
      d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
    }
  ]
];




return {"default":Heart};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const HeartPlus = [
  [
    "path",
    {
      d: "m14.479 19.374-.971.939a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5a5.2 5.2 0 0 1-.219 1.49"
    }
  ],
  ["path", { d: "M15 15h6" }],
  ["path", { d: "M18 12v6" }]
];




return {"default":HeartPlus};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const HeartPulse = [
  [
    "path",
    {
      d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
    }
  ],
  ["path", { d: "M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" }]
];




return {"default":HeartPulse};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const History = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
  ["path", { d: "M3 3v5h5" }],
  ["path", { d: "M12 7v5l4 2" }]
];




return {"default":History};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Info = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M12 16v-4" }],
  ["path", { d: "M12 8h.01" }]
];




return {"default":Info};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Layers = [
  [
    "path",
    {
      d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
    }
  ],
  ["path", { d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" }],
  ["path", { d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" }]
];




return {"default":Layers};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Lightbulb = [
  [
    "path",
    {
      d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
    }
  ],
  ["path", { d: "M9 18h6" }],
  ["path", { d: "M10 22h4" }]
];




return {"default":Lightbulb};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const ListOrdered = [
  ["path", { d: "M11 5h10" }],
  ["path", { d: "M11 12h10" }],
  ["path", { d: "M11 19h10" }],
  ["path", { d: "M4 4h1v5" }],
  ["path", { d: "M4 9h2" }],
  ["path", { d: "M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02" }]
];




return {"default":ListOrdered};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Menu = [
  ["path", { d: "M4 5h16" }],
  ["path", { d: "M4 12h16" }],
  ["path", { d: "M4 19h16" }]
];




return {"default":Menu};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Pin = [
  ["path", { d: "M12 17v5" }],
  [
    "path",
    {
      d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
    }
  ]
];




return {"default":Pin};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const ScanSearch = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  ["circle", { cx: "12", cy: "12", r: "3" }],
  ["path", { d: "m16 16-1.9-1.9" }]
];




return {"default":ScanSearch};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Settings = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3" }]
];




return {"default":Settings};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Shield = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ]
];




return {"default":Shield};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const ShieldMinus = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "M9 12h6" }]
];




return {"default":ShieldMinus};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const SlidersHorizontal = [
  ["path", { d: "M10 5H3" }],
  ["path", { d: "M12 19H3" }],
  ["path", { d: "M14 3v4" }],
  ["path", { d: "M16 17v4" }],
  ["path", { d: "M21 12h-9" }],
  ["path", { d: "M21 19h-5" }],
  ["path", { d: "M21 5h-7" }],
  ["path", { d: "M8 10v4" }],
  ["path", { d: "M8 12H3" }]
];




return {"default":SlidersHorizontal};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Sparkles = [
  [
    "path",
    {
      d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
    }
  ],
  ["path", { d: "M20 2v4" }],
  ["path", { d: "M22 4h-4" }],
  ["circle", { cx: "4", cy: "20", r: "2" }]
];




return {"default":Sparkles};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Swords = [
  ["polyline", { points: "14.5 17.5 3 6 3 3 6 3 17.5 14.5" }],
  ["line", { x1: "13", x2: "19", y1: "19", y2: "13" }],
  ["line", { x1: "16", x2: "20", y1: "16", y2: "20" }],
  ["line", { x1: "19", x2: "21", y1: "21", y2: "19" }],
  ["polyline", { points: "14.5 6.5 18 3 21 3 21 6 17.5 9.5" }],
  ["line", { x1: "5", x2: "9", y1: "14", y2: "18" }],
  ["line", { x1: "7", x2: "4", y1: "17", y2: "20" }],
  ["line", { x1: "3", x2: "5", y1: "19", y2: "21" }]
];




return {"default":Swords};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const VenetianMask = [
  ["path", { d: "M18 11c-1.5 0-2.5.5-3 2" }],
  [
    "path",
    {
      d: "M4 6a2 2 0 0 0-2 2v4a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V8a2 2 0 0 0-2-2h-3a8 8 0 0 0-5 2 8 8 0 0 0-5-2z"
    }
  ],
  ["path", { d: "M6 11c1.5 0 2.5.5 3 2" }]
];




return {"default":VenetianMask};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Wind = [
  ["path", { d: "M12.8 19.6A2 2 0 1 0 14 16H2" }],
  ["path", { d: "M17.5 8a2.5 2.5 0 1 1 2 4H2" }],
  ["path", { d: "M9.8 4.4A2 2 0 1 1 11 8H2" }]
];




return {"default":Wind};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const X = [
  ["path", { d: "M18 6 6 18" }],
  ["path", { d: "m6 6 12 12" }]
];




return {"default":X};},
function(get){/**
 * @license lucide v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const Zap = [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
    }
  ]
];




return {"default":Zap};}],cache=[];function get(id){return cache[id]||(cache[id]=factories[id](get));}const draw=get(0).createIcons,icons={"Activity":get(8).default,"ArrowLeft":get(9).default,"ArrowRight":get(10).default,"ArrowUpRight":get(11).default,"BookOpen":get(12).default,"ChevronLeft":get(13).default,"ChevronRight":get(14).default,"Crosshair":get(15).default,"Flag":get(16).default,"Heart":get(17).default,"HeartPlus":get(18).default,"HeartPulse":get(19).default,"History":get(20).default,"Info":get(21).default,"Layers":get(22).default,"Lightbulb":get(23).default,"ListOrdered":get(24).default,"Menu":get(25).default,"Pin":get(26).default,"ScanSearch":get(27).default,"Settings":get(28).default,"Shield":get(29).default,"ShieldMinus":get(30).default,"SlidersHorizontal":get(31).default,"Sparkles":get(32).default,"Swords":get(33).default,"VenetianMask":get(34).default,"Wind":get(35).default,"X":get(36).default,"Zap":get(37).default};globalThis.lucide??={createIcons(options={}){return draw({...options,icons});}};})();

/* CO-U02: UI-only asynchronous boundary. No economy, storage, or game state owner. */
(function (scope) {
  'use strict';
  const copy = x => x == null ? x : JSON.parse(JSON.stringify(x));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  function samePreparation(a,b){
    const normalize=p=>p?.schema==='CW-M1-preparation-2'?{schema:p.schema,acquire:[...p.acquire].sort(),deck:[...p.composition.deck].sort(),equipment:[...p.composition.equipment].sort(),migration_review:p.migration_review}:p;
    return same(normalize(a),normalize(b));
  }
  const retryable = new Set(['storage_write_failed','storage_unavailable','storage_open_failed','storage_open_blocked','storage_read_failed','connection_failed','invalid_response']);
  const outdated = new Set(['stale_view','stale_revision','stale_candidate','unknown_selection_handle','stale_or_unknown_candidate','missing_possession','offer_already_purchased']);
  function fault(code) { return {code,field:null,details:{}}; }
  function responseError(r) { return r?.display_data?.error || r?.error || null; }
  function validateView(r) {
    if (r?.schema !== 'CW-M1-view-1' || !Number.isSafeInteger(r?.meta?.revision) || r.meta.revision < 0 ||
        typeof r.meta.view_token !== 'string' || !r.meta.view_token ||
        !['home','exploring','return'].includes(r?.display_data?.phase)) throw fault('invalid_response');
    return r;
  }
  function requestId() {
    if (!scope.crypto?.randomUUID) throw fault('secure_request_id_unavailable');
    return 'cw-ui-' + scope.crypto.randomUUID();
  }
  function currentPlan(view) {
    const h=view?.display_data?.home;
    if(h?.contract==='CW-M1-preparation-2')return {schema:h.contract,acquire:[],composition:{deck:h.deck.composition.flatMap(x=>Array(x.count).fill(x.id)),equipment:h.equipment.entries.map(x=>x.id)},migration_review:null};
    return h ? {retain_learning:h.economy.learned.map(x=>x.base),cancel_learning:[],candidate:null,
      purchase_timing:view.display_data.draft?.plan?.purchase_timing||'after_preparation',next_preparation:{learn:[],equipment:h.equipment.entries.map(x=>x.id),
      deck:h.deck.composition.flatMap(x=>Array(x.count).fill(x.id))}} : null;
  }
  function makeSession(controller, {idFactory=requestId,reopen=null}={}) {
    if (!controller || !['inspect','execute'].every(k=>typeof controller[k]==='function')) throw fault('controller_not_connected');
    let view=null,draft=null,draftDetails={},comparison=null,quote=null,actionPreview=null,reservations=null;
    let pending=null,error=null,failed=null,stale=false,disposed=false,epoch=0,readSeq=0,editSeq=0;
    const listeners=new Set(), displayed=new Map();
    const state=()=>copy({view,draft,draftDetails,comparison,quote,actionPreview,reservations,pending,error,stale,
      canRetry:!!failed,localDirty:!!view&&!samePreparation(draft,view.display_data.draft?.plan ?? currentPlan(view))});
    const notify=()=>{if(!disposed)for(const f of listeners)f(state());};
    const busy=()=>disposed||pending?.kind==='write'||pending?.kind==='inspect';
    const allowed=type=>view?.display_data?.capabilities?.[type]?.available===true;
    function publish(r,keepLocal=false) {
      validateView(r);
      if(view && r.meta.revision<view.meta.revision)throw fault('stale_response');
      const beforeScene=view?.display_data.scene,afterScene=r.display_data.scene;
      if(beforeScene?.id!==afterScene?.id||view?.display_data.phase!==r.display_data.phase||view?.display_data.case?.attempts!==r.display_data.case?.attempts)displayed.clear();
      view=copy(r);
      if(!keepLocal){draft=copy(r.display_data.draft?.plan ?? currentPlan(r));draftDetails=copy(r.display_data.details||{});editSeq++;}
      comparison=quote=actionPreview=reservations=null;
    }
    async function refresh({preserveLocal=true}={}) {
      if(busy())return {ok:false,error:fault('busy')};
      const myEpoch=++epoch;readSeq++;pending={kind:'inspect'};error=null;notify();
      try {
        const source=view&&reopen?await reopen():controller;
        const r=await source.inspect();
        if(disposed||myEpoch!==epoch)return {ok:false,ignored:true};
        if(responseError(r))throw responseError(r);
        const changed=!!view&&(r?.meta?.view_token!==view.meta.view_token||r?.meta?.revision!==view.meta.revision);
        publish(r,preserveLocal&&!!view);controller=source;
        stale=preserveLocal&&changed;failed=null;return {ok:true,view:copy(view)};
      } catch(e){error=typeof e?.code==='string'?copy(e):fault('connection_failed');return {ok:false,error:copy(error)};}
      finally{if(myEpoch===epoch&&!disposed){pending=null;notify();}}
    }
    function setDraft(p) {
      if(busy()||failed||stale)return false;
      draft=copy(p);editSeq++;readSeq++;if(pending?.kind==='read')pending=null;comparison=quote=null;error=null;notify();return true;
    }
    async function read(method,args,field,destination=field) {
      if(busy()||stale||failed||!view)return {ok:false,error:fault('busy')};
      if(typeof controller[method]!=='function'){error=fault('feature_not_connected');notify();return {ok:false,error:copy(error)};}
      const seq=++readSeq,gen=epoch,edits=editSeq,token=view.meta.view_token,revision=view.meta.revision;
      pending={kind:'read',method};error=null;notify();
      try{
        const r=await controller[method]({view_token:token,...copy(args)});
        if(disposed||gen!==epoch||seq!==readSeq||edits!==editSeq||view.meta.view_token!==token)return {ok:false,ignored:true};
        validateView(r);
        if(r.meta.revision!==revision||r.meta.view_token!==token)throw fault('stale_view');
        if(responseError(r))throw responseError(r);
        const value=r.display_data[field];if(value==null)throw fault('invalid_response');
        if(field==='preparation_comparison'){comparison=copy(value);draftDetails=copy(r.display_data.details||{});}
        if(field==='conversion_quote')quote=copy(value);
        if(field==='action_preview'&&destination==='action_preview')actionPreview=copy(value);
        if(destination==='reservations')reservations=copy(value.current_reservations);
        const refusal=value.refusal;if(refusal&&outdated.has(refusal.code)){error=copy(refusal);stale=true;}
        return {ok:!refusal,value:copy(value)};
      }catch(e){if(gen===epoch&&seq===readSeq&&!disposed){error=typeof e?.code==='string'?copy(e):fault('connection_failed');if(outdated.has(error.code))stale=true;}return {ok:false,error:copy(error)};}
      finally{if(gen===epoch&&seq===readSeq&&!disposed){pending=null;notify();}}
    }
    async function send(command) {
      if(busy())return {ok:false,error:fault('busy')};
      const gen=++epoch;readSeq++;pending={kind:'write',type:command.type};error=null;comparison=quote=actionPreview=null;notify();
      try{
        const r=await controller.execute(copy(command));
        if(disposed||gen!==epoch)return {ok:false,ignored:true};
        if(responseError(r))throw responseError(r);
        validateView(r);
        const op=r.display_data.operation;
        if(!['committed','replayed'].includes(op?.status)||!Number.isSafeInteger(op.committed_revision)||op.committed_revision>r.meta.revision)throw fault('invalid_response');
        publish(r);failed=null;stale=false;error=null;
        if(command.type==='continue_scene'&&command.payload.advance===false){const key=command.payload.scene_id,seen=displayed.get(key)||new Set();for(const id of command.payload.displayed_text_ids||[])seen.add(id);displayed.set(key,seen);}
        return {ok:true,view:copy(view),operation:copy(op)};
      }catch(e){
        if(gen!==epoch||disposed)return {ok:false,ignored:true};
        error=typeof e?.code==='string'?copy(e):fault('connection_failed');
        failed=retryable.has(error.code)?copy(command):null;
        if(outdated.has(error.code)||error.code==='stale_response')stale=true;
        return {ok:false,error:copy(error)};
      }finally{if(gen===epoch&&!disposed){pending=null;notify();}}
    }
    async function execute(type,payload={}) {
      if(busy()||failed||!view||(stale&&type!=='discard_draft'))return {ok:false,error:fault('busy')};
      if(!(type==='continue_scene'&&payload.advance===false?(allowed('record_displayed_text')||allowed(type)):allowed(type))){error=fault('feature_not_connected');error.details.reasons=copy(view.display_data.capabilities?.[type]?.reasons||['feature_not_connected']);notify();return {ok:false,error:copy(error)};}
      if(!['save_draft','commit_preparation','discard_draft','ack_return'].includes(type)&&state().localDirty){error=fault('unsaved_draft');notify();return {ok:false,error:copy(error)};}
      if(type==='commit_preparation'&&(!comparison?.ok||!same(payload.plan,draft)))return {ok:false,error:fault('comparison_required')};
      if(type==='convert_items'&&(!quote||!same(payload.item_ids,quote.items.map(x=>x.id))))return {ok:false,error:fault('quote_required')};
      let id;try{id=idFactory();}catch(e){error=fault('secure_request_id_unavailable');notify();return {ok:false,error:copy(error)};}
      return send({request_id:id,expected_revision:view.meta.revision,view_token:view.meta.view_token,type,payload:copy(payload)});
    }
    async function ackReturn() {
      const cancelled=copy(draft?.cancel_learning||[]);
      const result=await execute('ack_return');if(!result.ok)return result;
      // Only stable base IDs are carried; no handle/name remapping or purchase plan transfer.
      const learned=new Set(view.display_data.home?.economy.learned?.map(x=>x.base)||[]);
      const cancel=cancelled.filter(id=>learned.has(id));
      if(draft&&cancel.length){const p=copy(draft);p.cancel_learning=cancel;p.retain_learning=p.retain_learning.filter(x=>!cancel.includes(x));
        p.next_preparation.equipment=p.next_preparation.equipment.filter(id=>!cancel.includes(view.display_data.details?.[id]?.base_id));
        setDraft(p);await read('previewPreparation',{plan:draft},'preparation_comparison');}
      return result;
    }
    function publicChoice(choice) {return view?.display_data?.exploration?.legal_actions?.some(c=>same(c.choice??c,choice));}
    async function previewAction(choice){
      if(!publicChoice(choice))return {ok:false,error:fault('illegal_action')};
      return read('previewAction',{choice},'action_preview');
    }
    async function play(choice){if(!publicChoice(choice))return {ok:false,error:fault('illegal_action')};return execute('play',{choice});}
    async function recordDisplayed(scene_id,text_ids) {
      if(busy()||failed||stale||!view)return {ok:false,error:fault('busy')};
      const d=view.display_data;
      const texts=Array.isArray(d.texts)?d.texts:Object.values(d.texts||{});
      const known=new Set(texts.map(t=>t.id));
      const eligible=new Set([...(d.scene?.text_ids||[]),...(d.scene?.optional_text_ids||[])]);
      if(d.scene?.id!==scene_id||!text_ids.length||text_ids.some(id=>!known.has(id)||!eligible.has(id)))return {ok:false,error:fault('invalid_displayed_text')};
      const seen=displayed.get(scene_id)||new Set(),fresh=[...new Set(text_ids)].filter(id=>!seen.has(id));
      if(!fresh.length)return {ok:true,skipped:true};
      const r=await execute('continue_scene',{scene_id,advance:false,displayed_text_ids:fresh});
      if(r.ok){fresh.forEach(id=>seen.add(id));displayed.set(scene_id,seen);}return r;
    }
    return {state,subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn);},refresh,setDraft,
      compare:()=>read('previewPreparation',{plan:draft},'preparation_comparison'),
      quote:item_ids=>read('quoteConversion',{item_ids},'conversion_quote'),previewAction,play,execute,ackReturn,recordDisplayed,
      reservations(){const a=view?.display_data?.exploration?.legal_actions?.[0];return a?read('previewAction',{choice:a.choice??a},'action_preview','reservations'):Promise.resolve({ok:false,error:fault('illegal_action')});},
      retry:()=>failed&&!busy()?send(copy(failed)):Promise.resolve({ok:false,error:fault('nothing_to_retry')}),
      can:allowed,dispose(){disposed=true;epoch++;readSeq++;listeners.clear();},
      async exportSave(){if(busy()||failed||typeof controller.exportSave!=='function')throw fault('export_not_available');return controller.exportSave();}};
  }
  function makeLauncher(Campaign, config, {idFactory=requestId}={}) {
    let pending=false,failed=null,active=null,error=null,disposed=false,rawImport='';
    const configCopy=copy(config),listeners=new Set();
    const state=()=>({pending,error:copy(error),canRetry:!!failed,active:!!active,rawImport});
    const emit=()=>{if(!disposed)for(const fn of listeners)fn(state());};
    const controllerFrom=r=>{
      if(responseError(r))throw responseError(r);
      // The design-owned provider must return an inspect/execute controller.
      // A module export path or an alternate result wrapper is never guessed here.
      if(!r||!['inspect','execute'].every(k=>typeof r[k]==='function'))throw fault('controller_result_not_connected');
      return r;
    };
    async function run(method,args,retrying=false){
      if(pending||disposed||(!retrying&&failed))return {ok:false,error:fault('busy')};
      if(active&&method!=='open')return {ok:false,error:fault('active_campaign')};
      if(typeof Campaign?.[method]!=='function'){error=fault('feature_not_connected');emit();return {ok:false,error};}
      pending=true;error=null;emit();
      try{const c=controllerFrom(await Campaign[method](copy(args)));if(disposed)return {ok:false,ignored:true};
        active=c;failed=null;return {ok:true,controller:c};
      }catch(e){if(disposed)return {ok:false,ignored:true};error=typeof e?.code==='string'?copy(e):fault('connection_failed');failed=method!=='open'&&retryable.has(error.code)?{method,args:copy(args)}:null;return {ok:false,error:copy(error)};}
      finally{pending=false;emit();}
    }
    return {state,subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn);},
      open:()=>run('open',{slot_id:configCopy.slot_id}),
      create:()=>run('create',{...configCopy,request_id:idFactory()}),
      importSave(document){if(pending||failed||active)return Promise.resolve({ok:false,error:fault('busy')});
        rawImport=typeof document==='string'?document:JSON.stringify(document);let parsed;
        try{parsed=typeof document==='string'?JSON.parse(document):copy(document);}catch{error=fault('invalid_save_json');emit();return Promise.resolve({ok:false,error:copy(error)});}
        return run('importSave',{slot_id:configCopy.slot_id,document:parsed,request_id:idFactory()});},
      retry:()=>failed?run(failed.method,failed.args,true):Promise.resolve({ok:false,error:fault('nothing_to_retry')}),
      dispose(){disposed=true;listeners.clear();}};
  }
  const api={makeSession,makeLauncher,currentPlan,validateView,samePreparation};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.CrossweaveUI=api;
})(globalThis);

/* Shared positions and labels for loaded-game surfaces. */
(function(api){'use strict';
 api.commonNavigationHTML=function(attribute='data-j',menuAction='menu'){
  return '<nav class="cw-common-nav" aria-label="共通">'+
   '<button type="button" class="cursor-interaction" '+attribute+'="records" data-common-control="records" aria-label="調査記録"><i data-lucide="book-open" aria-hidden="true"></i><span>調査記録</span></button>'+
   '<button type="button" class="cursor-interaction" '+attribute+'="'+menuAction+'" data-common-control="menu" aria-label="メニュー" data-tooltip="メニュー"><i data-lucide="menu" aria-hidden="true"></i></button></nav>';
 };
})(globalThis.CrossweaveUI);

/* Presentation geometry only. Input rectangles must come from visible UI objects. */
(function(api){'use strict';
 api.displayScale=element=>Number(element.closest('[data-display-scale]')?.dataset.displayScale)||1;
 api.uiSpace=function(element){
  const r=element.getBoundingClientRect(),scale=api.displayScale(element),left=element.clientLeft||0,top=element.clientTop||0;
  return {left:r.left+left*scale,top:r.top+top*scale,width:element.clientWidth||r.width/scale-2*left,height:element.clientHeight||r.height/scale-2*top,scale};
 };
 api.uiRect=function(element,container){const s=api.uiSpace(container),r=element?.getBoundingClientRect();return r&&r.width&&r.height?{x:(r.left-s.left)/s.scale,y:(r.top-s.top)/s.scale,w:r.width/s.scale,h:r.height/s.scale}:null;};
 api.placeWindow=function({width,height,anchor,avoid=[],preferredWidth=340,preferredHeight=280,margin=8,minWidth=172,minHeight=76}){
  const bounds={x:margin,y:margin,w:Math.max(1,width-2*margin),h:Math.max(1,height-2*margin)};
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  const regions=[bounds];
  for(const b of [anchor,...avoid].filter(Boolean)){
   regions.push({x:bounds.x,y:bounds.y,w:b.x-margin-bounds.x,h:bounds.h},
    {x:b.x+b.w+margin,y:bounds.y,w:width-margin-(b.x+b.w+margin),h:bounds.h},
    {x:bounds.x,y:bounds.y,w:bounds.w,h:b.y-margin-bounds.y},
    {x:bounds.x,y:b.y+b.h+margin,w:bounds.w,h:height-margin-(b.y+b.h+margin)});
  }
  const candidates=[];
  for(const source of regions){
   const x=Math.max(bounds.x,source.x),y=Math.max(bounds.y,source.y);
   const r={x,y,w:Math.min(bounds.x+bounds.w,source.x+source.w)-x,h:Math.min(bounds.y+bounds.h,source.y+source.h)-y};
   // The trigger determines position, never the dimensions of a detail window.
   const w=Math.min(preferredWidth,bounds.w),h=Math.min(preferredHeight,bounds.h);
   if(r.w<w||r.h<h)continue;
   for(const x of [r.x,r.x+(r.w-w)/2,r.x+r.w-w])for(const y of [r.y,r.y+(r.h-h)/2,r.y+r.h-h]){
    const p={x,y,w,h};
    const conflict=(anchor?overlap(p,anchor)*1000:0)+avoid.reduce((sum,b)=>sum+overlap(p,b)*10,0);
    const sizeLoss=preferredWidth*preferredHeight-w*h;
    const distance=anchor?Math.abs(x+w/2-anchor.x-anchor.w/2)+Math.abs(y+h/2-anchor.y-anchor.h/2):0;
    candidates.push({...p,score:conflict+sizeLoss*.05+distance*.01});
   }
  }
  const best=candidates.sort((a,b)=>a.score-b.score)[0]||bounds;
  return {left:Math.max(margin,best.x),top:Math.max(margin,best.y),width:best.w,height:best.h,source_overlap:anchor?overlap(best,anchor):0};
 };
 // Object details use the opposite screen edge so adjacent objects stay selectable.
 // Vertical clamping keeps lower-row details above the persistent footer.
 api.placeEdgeWindow=function({width,height,anchor,preferredWidth=520,preferredHeight=480,margin=16,preferredTop=anchor?.y??margin,bottom=height}){
  const w=Math.min(preferredWidth,Math.max(1,width-2*margin)),h=Math.min(preferredHeight,Math.max(1,height-2*margin));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  // Centered sources belong to the right half, including subpixel scaling noise.
  const right=!anchor||anchor.x+anchor.w/2<width/2-.01;
  return {left:right?Math.max(margin,width-margin-w):margin,top:clamp(preferredTop,margin,bottom-margin-h),width:w,height:h};
 };
 api.placeActorWindow=function({width,height,anchor,preferredWidth=416,preferredHeight=384,margin=16}){
  return api.placeEdgeWindow({width,height,anchor,preferredWidth,preferredHeight,margin,preferredTop:margin});
 };
 // A linked pair keeps the parent where possible. At narrow widths both panes
 // reflow side by side; neither pane covers or silently replaces its parent.
 api.placeWindowPair=function({width,height,parent,preferredWidth=340,preferredHeight=350,margin=8,gap=8,minWidth=144}){
  const usable=Math.max(1,width-2*margin),h=Math.max(1,Math.min(preferredHeight,height-2*margin));
  const w=Math.min(preferredWidth,(usable-gap)/2),top=Math.max(margin,Math.min(parent?.top??margin,height-margin-h));
  const groupWidth=2*w+gap,left=Math.max(margin,Math.min(parent?.left??margin,width-margin-groupWidth));
  return [{left,top,width:w,height:h},{left:left+w+gap,top,width:w,height:h}];
 };
})(globalThis.CrossweaveUI);

/* Layout only. Source paragraphs and their read-receipt IDs are unchanged. */
(function(api){'use strict';
 const closing=/^[、。，．！？!?）」』】〕］｝〉》ーぁぃぅぇぉっゃゅょァィゥェォッャュョ]/;
 const opening=/[（「『【〔［｛〈《]$/;
 const graphemes=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);
 api.proseLines=function(text,fits){
  const chars=graphemes(text),lines=[];let start=0;
  while(start<chars.length){
   let lo=1,hi=chars.length-start,fit=1;
   while(lo<=hi){const n=(lo+hi)>>1;if(fits(chars.slice(start,start+n).join(''))){fit=n;lo=n+1;}else hi=n-1;}
   if(start+fit===chars.length){lines.push(chars.slice(start).join(''));break;}
   let sentence=0,comma=0;
   for(let n=1;n<=fit;n++){
    const ch=chars[start+n-1];if(!/[。！？、，,]/.test(ch))continue;
    let end=n;while(start+end<chars.length&&/[）」』】〕］｝〉》]/.test(chars[start+end]))end++;
    if(end>fit)continue;
    if(/[。！？]/.test(ch))sentence=end;else comma=end;
   }
   let cut=sentence||comma||fit;
   if(!sentence&&!comma){while(cut>1&&(closing.test(chars[start+cut]||'')||opening.test(chars[start+cut-1])))cut--;}
   lines.push(chars.slice(start,start+cut).join(''));start+=cut;
  }return lines;
 };
 const cache=new WeakMap();
 api.layoutProse=function(root){
  for(const node of root.querySelectorAll('.cj-story p,.cj-prose,.cj-inspect-scroll p,.cw-drawer-body p')){
   const width=node.clientWidth;if(!width)continue;
   const style=getComputedStyle(node),available=width-parseFloat(style.paddingLeft||0)-parseFloat(style.paddingRight||0);
   const old=cache.get(node),source=old?.source??node.textContent,key=[available,style.font,style.letterSpacing,document.fonts?.status||''].join('|');
   if(old?.key===key||available<1)continue;
   const probe=document.createElement('span');probe.className='cw-prose-measure';probe.setAttribute('aria-hidden','true');
   Object.assign(probe.style,{position:'absolute',visibility:'hidden',whiteSpace:'pre',pointerEvents:'none',width:'max-content',maxWidth:'none',font:'inherit',letterSpacing:'inherit'});node.append(probe);
   const scale=api.displayScale?.(node)||1;
   const lines=api.proseLines(source,text=>{probe.textContent=text;return probe.getBoundingClientRect().width/scale<=available-.5;});
   probe.remove();node.replaceChildren(...lines.map(text=>{const line=document.createElement('span');line.className='cw-prose-line';line.textContent=text;return line;}));
   cache.set(node,{source,key});
  }
 };
})(globalThis.CrossweaveUI);

/* Shared feedback only. The caller owns the hold timer and the action. */
(function(global){'use strict';
 global.CrossweaveHoldCue={mount(host,{scale=()=>1}={}){
  const doc=host.ownerDocument,win=doc.defaultView,node=doc.createElement('div');
  node.className='cw-hold-cue';node.hidden=true;node.setAttribute('aria-hidden','true');
  node.innerHTML='<span class="cw-hold-ring"></span><span class="cw-hold-label"></span>';host.append(node);
  const revealDelay=120;
  let frame=null,active=null,disposed=false;
  function position(){if(!active)return;const s=scale()||1,r=host.getBoundingClientRect(),pad=Math.max(25,(active.label.length*12+8)/2+4)/s;
   const width=host.clientWidth||r.width/s,height=host.clientHeight||r.height/s;
   const x=(active.x-r.left)/s-(host.clientLeft||0),y=(active.y-r.top)/s-(host.clientTop||0);
   node.style.left=Math.max(pad,Math.min(width-pad,x+20/s))+'px';
   node.style.top=Math.max(pad,Math.min(height-42/s,y-20/s))+'px';
   node.style.transform='translate(-50%,-50%) scale('+(1/s)+')';
  }
  function tick(now){frame=null;if(!active||disposed)return;
   const elapsed=now-active.started,progress=Math.max(0,Math.min(1,elapsed/active.duration));
   node.hidden=elapsed<revealDelay;
   node.style.setProperty('--cw-hold-progress',String(progress));position();
   if(progress<1)frame=win.requestAnimationFrame(tick);
  }
  function cancel(){if(frame!==null)win.cancelAnimationFrame(frame);frame=null;active=null;node.hidden=true;node.removeAttribute('data-hold-action');}
  return {start(event,duration,action,label=action==='detail'?'詳細':'移動'){cancel();if(disposed||duration<=0)return;
    active={x:event.clientX,y:event.clientY,started:win.performance.now(),duration,label};
    node.dataset.holdAction=action;node.querySelector('.cw-hold-label').textContent=label;
    node.style.setProperty('--cw-hold-progress','0');position();frame=win.requestAnimationFrame(tick);
   },move(event){if(active){active.x=event.clientX;active.y=event.clientY;position();}},cancel,
   dispose(){cancel();disposed=true;node.remove();}};
 }};
})(globalThis);

/* Temporary artwork bindings use public case/target IDs only; no game decisions. */
(function(api){'use strict';
 const assets={"water":{"id":"water","width":1920,"height":1280,"position":"50% 40%","src":"data:image/webp;base64,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"},"shop":{"id":"shop","width":1920,"height":1280,"position":"50% 50%","src":"data:image/webp;base64,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"},"diver":{"id":"diver","width":640,"height":400,"position":"50% 50%","src":"data:image/webp;base64,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"}};
 function profile(data,actor){return (data.knowledge_views||[]).find(v=>v.key===actor?.knowledge_key)?.target_id;}
 api.actorArtwork=function(data,actor){
  if(data.case?.id!=='SCN-001')return null;
  return profile(data,actor)==='SCN-001-ACT02'?assets.diver:null;
 };
 api.sceneArtwork=function(data){
  if(data.case?.id!=='SCN-001')return null;
  if(['home','return'].includes(data.phase))return assets.shop;
  const actors=Object.values(data.exploration?.actors||{});
  // ACT04/S02R explicitly share the temporary location art in this review.
  // A distinct post-resolution water state remains a visual-production task.
  return ['SCN-001-S02','SCN-001-S02R'].includes(data.scene?.id)||actors.some(a=>a.active&&['SCN-001-ACT01','SCN-001-ACT04'].includes(profile(data,a)))?assets.water:null;
 };
 api.applySceneArtwork=function(node,data){const a=api.sceneArtwork(data);
  if(a){node.dataset.artwork=a.id;node.style.backgroundImage='url("'+a.src+'")';node.style.backgroundPosition=a.position;}
  else{delete node.dataset.artwork;node.style.removeProperty('background-image');node.style.removeProperty('background-position');}
 };
})(globalThis.CrossweaveUI);

/* UI-G-001 v0.2 rendering, with the controller supplied by the caller. */
(function(api){'use strict';
api.mountPreparation=function(root,session){
 const $=s=>root.querySelector(s),clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pt=n=>Number.isInteger(n)?String(n/100):'—';
 const icon=(name,fallback='◇')=>`<i aria-hidden="true" data-lucide="${esc(name)}">${fallback}</i>`;
 const button=(text,action,extra='',cls='')=>`<button type="button" data-action="${action}" ${extra} class="${cls}">${text}</button>`;
 let view,plan,section='deck',win=null,comparison=null,quote=null,notice='',stale=false,failed=false;
 let hoverTimer,leaveTimer,disposed=false,snapshot,previousToken=null,oldDetails={};
 const events=new AbortController();
 root.classList.add('cw-m1');
 root.innerHTML='<div class="cw-game"><header class="cw-top" data-top></header><div class="cw-workspace" data-workspace></div><div class="cw-notice" data-notice role="status" aria-live="polite"></div><footer class="cw-footer" data-footer></footer><div data-overlay></div></div>';
 const home=()=>view?.display_data.home,dd=()=>view.display_data;
 const currentPlan=()=>api.currentPlan(view);
 const dirty=()=>!!plan&&JSON.stringify(plan)!==JSON.stringify(currentPlan());
 const unsaved=()=>!!plan&&JSON.stringify(plan)!==JSON.stringify(dd().draft?.plan);
 const blocked=()=>!!snapshot?.pending||snapshot?.canRetry||stale;
 function detail(id){const key=id==='$purchase'?plan?.candidate:id;return dd().details?.[key]||{name:'詳細の接続待ち',icon:'circle-help',kind:'card'};}
 function name(id){return detail(id).name;}
 function counts(ids){const r=new Map();for(const id of ids||[])r.set(id,(r.get(id)||0)+1);return [...r].map(([id,count])=>({id,count}));}
 function isLearned(base){return plan?.retain_learning.includes(base)||plan?.next_preparation.learn.includes(base);}
 function errorText(e){return ({connection_failed:'応答を確認できません。下書きを保持しています',invalid_response:'保存結果を確認できません。選択は残っています',comparison_required:'変更をもう一度確認してください',busy:'処理中です',stale_response:'古い応答は適用しませんでした',secure_request_id_unavailable:'操作を送信できません'})[e?.code]||noticeFor(e);}
 function publicFields(d){
  const rows=[];const add=(label,x)=>{if(x!==null&&x!==undefined)rows.push(`<dt>${esc(label)}</dt><dd>${esc(x)}</dd>`);};
  if(d.primary){add('主効果',d.primary.power);add('探査',d.primary.hit);add('攪乱',d.primary.evasion);add('機転',d.primary.crit_gain);}
  if(d.field){add('場の効果',d.field.power);add('場の探査',d.field.hit);}
  add('手札期限',d.life);add('設置間隔',d.action_intervals?.place);add('一致間隔',d.action_intervals?.match);
  const recovery={shared_recovery:'共有回収へ',consumed_on_recovery:'回収時に消耗',destroyed_on_recovery_retired_origin:'元の主体が離脱したため回収時に消滅',destroyed_on_recovery_filler:'回収時に消滅'};
  return (d.trigger_text?`<p>${esc(d.trigger_text)}</p>`:'')+(rows.length?`<dl class="cw-ledger">${rows.join('')}</dl>`:'')+(recovery[d.recovery_rule]?`<small>${recovery[d.recovery_rule]}</small>`:'');
 }
 /* UI-G-001 v0.2: show the named objects and the result of each choice.
 * Inserted into mountPreparation's scope. All prices/results come from public view/preview.
 */
function noticeFor(e) {
 const z=e?.details||{};
 const messages={
  insufficient_unspent_funds:'着想が足りません',
  insufficient_learning_funds:'着想が足りません',
  unlearned_equipment_base:'この心得を覚えると装備できます',
  equipment_capacity_exceeded:'装備が入りきりません',
  deck_size:'札を'+(z.required_size||12)+'枚選んでください',
  invalid_deck_size:'札を'+(z.required||12)+'枚選んでください',
  deck_base_cap:'同じ札は'+(z.cap||2)+'枚までです',
  deck_base_cap_exceeded:'同じ札は2枚までです',
  duplicate_owned_card:'同じ1枚を重ねて選ぶことはできません',
  duplicate_equipment:'同じ心得を重ねて装備することはできません',
  item_in_use:'持っていく物から外し、その変更を確定してください',
  item_locked:'保護を外すと手放せます',
  storage_write_failed:'保存できませんでした。選んだ内容は残っています',
  stale_revision:'別の操作で内容が変わりました。最新を確認してください',
  stale_view:'別の操作で内容が変わりました。最新を確認してください',
  stale_candidate:'この品は選べなくなりました',
  unknown_selection_handle:'この選択は古くなりました',
  candidate_unavailable:'今回はすでに買い物を終えています',
  feature_not_connected:'この機能は接続待ちです',
  conversion_value_not_connected:'戻る着想の額は接続待ちです',
  return_not_acknowledged:'「札を組む」から進んでください',
  purchase_not_selected:'買う品を選ぶか、選んだ札から外してください',
  dirty_draft:'選んだ変更を確認してください',
  content_not_ready:'探索への接続待ちです',
  learning_partition:'覚える心得を選び直してください',
  invalid_plan:'選んだ内容を確認できません',
  request_conflict:'再試行する操作が一致しません',
  invalid_request:'この操作を確認できません'
 };
 return messages[e?.code]||'選んだ内容を確認してください';
}
function baseName(base){return name('base:'+base);}
function baseNames(bases){return (bases||[]).map(baseName).join('・');}
function tag(text,cls=''){return '<span class="cw-state '+cls+'">'+esc(text)+'</span>';}
function tile(id,origin,amount){
 const d=detail(id),selected=plan?.next_preparation.deck.includes(id)||plan?.next_preparation.equipment.includes(id);
 const cancelling=origin==='心得'&&plan.cancel_learning.includes(d.base_id);
 const learning=origin==='心得'&&plan.next_preparation.learn.includes(d.base_id);
 const status=cancelling?'忘れる':learning?'覚える':selected?'✓':'';
 return '<button type="button" class="cw-tile '+(origin==='予定'||learning?'cw-planned ':'')+(cancelling?'cw-removing':'')+'" data-detail="'+esc(id)+'" data-origin="'+esc(origin)+'" aria-label="'+esc(d.name+(amount?'・'+amount:'')+(status?'・'+status:''))+'" aria-pressed="'+(win?.id===id&&win?.pinned?'true':'false')+'">'+
  '<span class="cw-art">'+icon(d.icon)+'</span><span class="cw-name">'+esc(d.name)+'</span>'+
  (status?tag(status):'')+(amount?'<span class="cw-count">'+esc(origin==='候補'?amount:'×'+amount)+'</span>':'')+'</button>';
}
function mini(id,count=1){
 if(stale)return '<span class="cw-mini cw-stale">'+esc(oldDetails[id==='$purchase'?plan?.candidate:id]?.name||'前の選択')+(count>1?' ×'+count:'')+'</span>';
 return '<button type="button" class="cw-mini '+(id==='$purchase'?'cw-planned':'')+'" data-detail="'+esc(id)+'" data-origin="予定">'+
  icon(detail(id).icon)+'<span>'+esc(name(id))+'</span>'+(count>1?'<small>×'+count+'</small>':'')+'</button>';
}
function moneyPair(c){
 if(!c?.ok)return '';
 return '<div class="cw-money-pair" aria-label="着想の比較"><div><small>現在</small><strong>'+pt(home().economy.unspent_units)+'</strong></div>'+
  '<span aria-hidden="true">→</span><div><small>変更後</small><strong>'+pt(c.stages.prepared.unspent_units)+'</strong></div></div>';
}
function changeRow(title,ids,amount,kind=''){
 return '<div class="cw-change '+kind+'"><div><small>'+esc(title)+'</small><span>'+esc(ids)+'</span></div>'+
  (amount!==undefined?'<strong>'+esc(amount)+'</strong>':'')+'</div>';
}
function namedChanges(c){
 if(!c?.ok)return c?'<p class="cw-error" role="alert">'+esc(noticeFor(c.refusal))+'</p>':'';
 let html='';
 if(plan.cancel_learning.length)html+=changeRow('忘れる',baseNames(plan.cancel_learning),'+'+pt(c.cancellation.actual_refund_units),'cw-removing');
 if(plan.candidate)html+=changeRow(detail('$purchase').kind==='card'?'1枚増える':'1個増える',name('$purchase'),'−'+pt(c.purchase.cost_units));
 if(plan.next_preparation.learn.length)html+=changeRow('覚える',baseNames(plan.next_preparation.learn),'−'+pt(c.learning.payment_units));
 return html;
}
function ledger(c){
 if(!c?.ok)return namedChanges(c);
 return '<section class="cw-money"><h3>着想</h3>'+moneyPair(c)+namedChanges(c)+'</section>';
}
function draftPane(){
 if(!home())return '';
 const p=plan.next_preparation,c=comparison;
 const used=c?.ok?c.prepared.equipment.used:dirty()?null:home().equipment.used;
 return '<aside class="cw-draft" aria-label="持っていく物"><div class="cw-row"><h3>持っていく物</h3>'+ (dirty()?tag('変更中'):'')+'</div>'+
  '<div class="cw-draft-content"><div class="cw-row"><span>札</span><small>'+p.deck.length+' / '+home().deck.required_size+'</small></div>'+
  '<div class="cw-mini-grid">'+counts(p.deck).map(x=>mini(x.id,x.count)).join('')+'</div>'+
  '<div class="cw-row"><span>装備</span><small>'+(used??'—')+' / '+home().equipment.capacity+'</small></div>'+
  '<div class="cw-mini-grid">'+(p.equipment.length?p.equipment.map(id=>mini(id)).join(''):'<small>なし</small>')+'</div>'+
  (dirty()?ledger(c):'')+'</div><div class="cw-draft-actions">'+
  (dirty()?button('変更を確認','review','','cw-primary')+'<div class="cw-actions">'+button('選択を保存','save-draft',stale?'disabled':'')+button('選択を戻す','discard-confirm')+'</div>':button('探索へ出発','depart','','cw-primary'))+'</div></aside>';
}
function learningGroups(){
 const h=home(),remembered=h.learning_options.filter(o=>h.economy.learned.some(l=>l.base===o.base));
 const other=h.learning_options.filter(o=>!h.economy.learned.some(l=>l.base===o.base));
 let html='';
 if(remembered.length)html+='<span class="cw-section-title">覚えている</span><div class="cw-grid">'+remembered.map(o=>tile('base:'+o.base,'心得')).join('')+'</div>';
 if(other.length&&dd().phase!=='return')html+='<span class="cw-section-title">覚えられる</span><div class="cw-grid">'+other.map(o=>tile('base:'+o.base,'心得')).join('')+'</div>';
 return html||'<p>覚えている心得はありません</p>';
}
function content(){
 const h=home();if(!h)return '<main class="cw-main"><p>表示データの接続待ちです</p></main>';
 let body='',heading='';
 if(section==='deck'){
  heading='札組';
  body='<span class="cw-section-title">いつでも使える</span><div class="cw-grid">'+h.free_card_options.map(id=>tile(id,'初期札',plan.next_preparation.deck.filter(x=>x===id).length)).join('')+'</div>';
  const owned=h.owned.filter(o=>o.selection_kind==='deck');
  if(owned.length)body+='<span class="cw-section-title">持っている</span><div class="cw-grid">'+owned.map(o=>tile(o.id,'所持',plan.next_preparation.deck.includes(o.id)?1:0)).join('')+'</div>';
  if(plan.candidate&&detail('$purchase').kind==='card')body+='<span class="cw-section-title">買う予定</span><div class="cw-grid">'+tile('$purchase','予定',plan.next_preparation.deck.includes('$purchase')?1:0)+'</div>';
 }
 if(section==='skills'){
  heading='心得';body=learningGroups();
  const owned=h.owned.filter(o=>o.selection_kind==='equipment');
  if(owned.length)body+='<span class="cw-section-title">持っている</span><div class="cw-grid">'+owned.map(o=>tile(o.id,'所持')).join('')+'</div>';
  if(plan.candidate&&detail('$purchase').kind==='passive')body+='<span class="cw-section-title">買う予定</span><div class="cw-grid">'+tile('$purchase','予定')+'</div>';
 }
 if(section==='owned'){
  heading='持ち物';
  body=!dd().capabilities?.purchase?.available&&!dd().capabilities?.convert_items?.available?'<div class="cw-empty"><p>持ち物の機能は接続待ちです</p></div>':
   '<div class="cw-grid">'+h.owned.map(o=>tile(o.id,o.locked?'保護中':'所持')).join('')+'</div>'+(!h.owned.length?'<div class="cw-empty"><p>まだ何も持っていません</p></div>':'');
 }
 if(section==='offers'){
  heading='買い物';
  body=!dd().capabilities?.purchase?.available?'<div class="cw-empty"><p>買い物の機能は接続待ちです</p></div>':
   !h.candidates.length?'<div class="cw-empty"><p>今は品物がありません</p></div>':
   '<div class="cw-row"><small>'+(h.offers?.status==='purchased'?'今回は購入済み':'1つ選べます')+'</small></div><div class="cw-grid">'+h.candidates.map(o=>tile(o.id,'候補',pt(o.price_units))).join('')+'</div>';
  if(plan.candidate)body+='<div class="cw-actions">'+button('買う品を選び直す','skip')+'</div>';
 }
 return '<main class="cw-main" aria-label="'+heading+'"><h2 class="cw-sr-only">'+heading+'</h2><div class="cw-scroll" data-scroll>'+body+'</div><small data-scroll-hint hidden>↓</small></main>'+draftPane();
}
function returnPage(){
 const r=dd().return_receipt;if(!r)return '<main class="cw-return"><p>帰還表示の接続待ちです</p></main>';
 const outcome={clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'}[r.outcome]||'帰還';
 const kept=r.kept_count??r.kept_items?.length, lost=r.lost_count??r.lost_items?.length;
 const found=(r.new_unlocks||[]).map(id=>Object.values(dd().details||{}).find(d=>d.base_id===id)?.name).filter(Boolean);
 return '<main class="cw-return"><div class="cw-return-head"><small>'+outcome+'</small><h2>戻ってきた</h2><div>着想 <strong>+'+pt(r.gained_units)+'</strong></div></div>'+
  '<div class="cw-return-list">'+(kept!==undefined?'<div class="cw-row"><span>持ち帰った物</span><span>'+kept+'個</span></div>':'')+
  (lost?'<div class="cw-row"><span>失った物</span><span>'+lost+'個</span></div>':'')+
  (r.new_unlocks?.length?'<details><summary>見つけたもの</summary><p>'+esc(found.join('・')||r.new_unlocks.length+'種類')+'</p></details>':'')+
  (dirty()?ledger(comparison):'')+'</div><div class="cw-return-actions">'+
  (home()?.economy.learned.length?button('心得を選び直す','return-pick'):'')+
  (dirty()?button('変更を確認','review'):'')+button('札を組む','ack','','cw-primary')+'</div></main>';
}
function popupHeader(title,canPin=false){
 return '<div class="cw-row"><h2>'+esc(title)+'</h2>'+
  (canPin?button(icon(win?.pinned?'pin':'pin-off',win?.pinned?'◆':'◇'),'pin','aria-label="'+(win?.pinned?'ピン留めを解除':'ピン留め')+'" aria-pressed="'+!!win?.pinned+'"','cw-pin'):'')+
  button('閉じる','close','','cw-close')+'</div>';
}
function detailBody(id){
 const d=detail(id),h=home(),candidate=h?.candidates.find(c=>c.id===id),owned=h?.owned.find(o=>o.id===id);
 const learned=isLearned(d.base_id),n=plan?.next_preparation.deck.filter(x=>x===id).length||0,returning=dd().phase==='return';
 let body=popupHeader(d.name,true)+'<div class="cw-art">'+icon(d.icon)+'</div>'+
  (d.affixes?.length?d.affixes.map(a=>'<div><small>'+esc(a.label)+'</small><p>'+esc(a.description)+'</p></div>').join(''):'')+
  (d.effect_text?'<p>'+esc(d.effect_text)+'</p>':'')+publicFields(d);
 if(candidate){
  body+='<div class="cw-price"><span>着想</span><strong>'+pt(candidate.price_units)+'</strong><small>1'+(d.kind==='card'?'枚':'個')+'</small></div>'+
   (d.kind==='passive'&&!learned?'<small>この品を使うには「'+esc(baseName(d.base_id))+'」を覚える必要があります</small>':'')+
   '<div class="cw-actions">'+button(plan.candidate===id?'買う予定から外す':'これを買う予定にする','candidate','data-id="'+esc(id)+'" '+(!candidate.available?'disabled':''),'cw-primary')+'</div>';
  return body;
 }
 if(id.startsWith('base:')&&d.kind==='passive'){
  const already=h.economy.learned.some(l=>l.base===d.base_id),cancelled=plan.cancel_learning.includes(d.base_id),newly=plan.next_preparation.learn.includes(d.base_id);
  if(already){
   body+='<section class="cw-choice-block"><div class="cw-row"><span>'+(cancelled?'忘れる予定':'覚えている')+'</span>'+
    button(cancelled?'忘れずに残す':'忘れる','learning','data-base="'+esc(d.base_id)+'"')+'</div>'+
    '<small>装備できなくなり、着想が戻ります。持ち物は残ります。</small></section>';
  }else if(!returning){
   body+='<section class="cw-choice-block"><div class="cw-price"><span>覚える</span><strong>着想 '+pt(d.learning_cost_units)+'</strong></div>'+
    button(newly?'覚える予定を外す':'この心得を覚える','learning','data-base="'+esc(d.base_id)+'"','cw-primary')+'</section>';
  }
 }
 if(!returning){
  if(d.kind==='card')body+='<div class="cw-row"><span>持っていく枚数</span><div class="cw-actions">'+
   button('−','deck-remove','data-id="'+esc(id)+'" aria-label="札組から1枚外す" '+(!n?'disabled':''))+'<strong>'+n+'</strong>'+
   button('＋','deck-add','data-id="'+esc(id)+'" aria-label="札組に1枚加える" '+(!id.startsWith('base:')&&n?'disabled':''),'cw-primary')+'</div></div>';
  else body+='<section class="cw-choice-block"><div class="cw-row"><span>装備 '+d.equipment_cost+'</span>'+
   button(plan.next_preparation.equipment.includes(id)?'装備から外す':'装備する','equip','data-id="'+esc(id)+'" '+(!learned?'disabled':''),'cw-primary')+'</div>'+
   (!learned?'<small>覚えると装備できます</small>':'')+'</section>';
 }
 if(owned&&!returning)body+='<div class="cw-actions">'+button(icon(owned.locked?'lock-keyhole':'lock-open',owned.locked?'◆':'◇'),'lock','data-id="'+esc(id)+'" aria-label="'+(owned.locked?'保護を外す':'保護する')+'"')+
  button('手放す額を見る','quote','data-id="'+esc(id)+'"','cw-danger')+'</div>';
 return body;
}
function equipmentChanges(c){
 let html='';
 for(const [key,label] of [['removed','装備から外れる'],['added','装備する']]){
  if(c.differences.equipment[key].length)html+='<div class="cw-result-group"><small>'+label+'</small><div class="cw-mini-grid">'+c.differences.equipment[key].map(x=>mini(x.id)).join('')+'</div></div>';
 }
 const changed=new Set([...c.differences.deck.removed,...c.differences.deck.added].map(x=>x.id));
 if(changed.size){
  const before=counts(currentPlan().next_preparation.deck),after=counts(plan.next_preparation.deck);
  html+='<div class="cw-result-group"><small>持っていく札</small>';
  for(const id of changed)html+=changeRow('',name(id),(before.find(x=>x.id===id)?.count||0)+' → '+(after.find(x=>x.id===id)?.count||0)+'枚');
  html+='</div>';
 }
 if(c.differences.existing_possessions_preserved&&plan.cancel_learning.length)html+='<small>すでに持っている物は残ります</small>';
 if(plan.candidate)html+='<div class="cw-result-group"><small>増える持ち物</small>'+mini('$purchase')+
  (!c.purchase.selected_in_preparation?'<small>持っていく物には入っていません</small>':'')+'</div>';
 return html;
}
function paymentOrder(){
 if(!plan.candidate||!plan.next_preparation.learn.length)return '';
 const buy=name('$purchase'),learn=baseNames(plan.next_preparation.learn);
 return '<details class="cw-payment-order"><summary>支払いの順番</summary><label><span>先に払う対象</span><select data-timing aria-label="先に払う対象">'+
  '<option value="before_preparation" '+(plan.purchase_timing==='before_preparation'?'selected':'')+'>'+esc(buy)+'（品物）</option>'+
  '<option value="after_preparation" '+(plan.purchase_timing==='after_preparation'?'selected':'')+'>'+esc(learn)+'（覚える）</option></select></label></details>';
}
function renderWindow(){
 const overlay=$('[data-overlay]');if(!win){overlay.innerHTML='';return;}
 let body='',review=false,title='';
 if(win.type==='detail'){title=name(win.id);body=detailBody(win.id);}
 if(win.type==='learning-picker'){
  title='心得を選ぶ';body=popupHeader(title)+learningGroups()+(dirty()?ledger(comparison):'')+
   '<div class="cw-actions">'+(dirty()?button('変更を確認','review'):'')+button('札を組む','ack','','cw-primary')+'</div>';
 }
 if(win.type==='review'){
  review=true;title='選んだ変更';const c=comparison;
  body=popupHeader(title)+(c?.ok?'<div class="cw-review-cols">'+ledger(c)+'<section class="cw-review-list">'+equipmentChanges(c)+'</section></div>':c?namedChanges(c):'<p>確認中…</p>')+
   paymentOrder()+'<div class="cw-actions">'+
   (dd().phase==='return'?button('札を組む','ack','','cw-primary'):button('変更を確定','commit',c?.ok&&!stale?'':'disabled','cw-primary'))+'</div>';
  if(dd().phase==='return')body+='<small>ここではまだ変更しません</small>';
 }
 if(win.type==='conversion'){
  title=name(win.id)+'を手放す';body=popupHeader(title);
  if(quote)body+='<div class="cw-art">'+icon(detail(win.id).icon)+'</div>'+changeRow('なくなる',name(win.id),quote.removed_count+'個')+
   changeRow('戻る','着想','+'+pt(quote.total_units))+changeRow('手放した後','着想',pt(quote.unspent_after_units))+
   '<div class="cw-actions">'+button('手放す','convert','data-id="'+esc(win.id)+'"','cw-danger')+'</div>';
  else body+='<p class="cw-error" role="alert">'+esc(notice||'確認中…')+'</p>';
 }
 if(win.type==='discard'){
  title='選んだ変更を元に戻す';body=popupHeader(title)+'<p>まだ確定していない変更だけを戻します。</p>'+
   '<div class="cw-actions">'+button('選択を戻す','discard','','cw-danger')+'</div>';
 }
 overlay.innerHTML='<div class="'+(win.type==='detail'?'cw-detail-layer':'cw-shade')+'" data-outside><section class="cw-popup '+(review?'cw-review':'')+'" role="dialog" aria-label="'+esc(title)+'">'+body+'</section></div>';
 positionDetail();icons();
}
function openDetail(id,origin,pinned){
 if(win?.type==='detail'&&win.id===id&&pinned){if(win.pinned){win=null;renderWindow();return;}win.pinned=true;renderWindow();return;}
 if(!pinned&&win?.pinned)return;
 win={type:'detail',id,origin,pinned};renderWindow();
}

 function icons(){if(typeof lucide!=='undefined')lucide.createIcons({attrs:{width:16,height:16}});}
 function controls(){
  const readonly=new Set(['close','pin','review','return-pick','return-compare','discard-confirm','refresh']);
  const caps={'commit':'commit_preparation','save-draft':'save_draft','discard':'discard_draft','ack':'ack_return','depart':'depart','convert':'convert_items','quote':'convert_items','lock':'set_item_lock','candidate':'purchase'};
  for(const b of root.querySelectorAll('[data-action]')){
   const a=b.dataset.action;if(a.startsWith('nav-')||readonly.has(a))continue;
   if((blocked()&&a!=='retry')||(caps[a]&&!session.can(caps[a])))b.disabled=true;
  }
  if(stale){for(const b of root.querySelectorAll('[data-action="discard"]'))b.disabled=!!snapshot.pending||snapshot.canRetry;}
  root.querySelectorAll('[data-timing]').forEach(e=>e.disabled=blocked());
  root.querySelectorAll('[data-action="depart"]').forEach(b=>{if(!dd().case?.id)b.disabled=true;});
  root.setAttribute('aria-busy',String(!!snapshot?.pending));
 }
 function render(){if(disposed||!view)return;
  const scroll=[...root.querySelectorAll('[data-scroll],.cw-draft-content,.cw-popup')].map(e=>[e.matches('[data-scroll]')?'[data-scroll]':e.classList.contains('cw-popup')?'.cw-popup':'.cw-draft-content',e.scrollTop]);
  const h=home(),returning=dd().phase==='return';
  $('[data-top]').innerHTML='<div class="cw-top-title"><span>crossweave</span></div><div class="cw-wallet">'+(h?'<span>着想 <strong>'+pt(h.economy.unspent_units)+'</strong></span>':'')+'</div>';
  $('[data-workspace]').dataset.screen=returning?'return':section;
  $('[data-workspace]').innerHTML=returning?returnPage():content();
  $('[data-footer]').innerHTML=returning?'':[['deck','札組'],['skills','心得'],['owned','持ち物'],['offers','買い物']].map(([s,l])=>button(l,'nav-'+s,`aria-pressed="${section===s}" ${!h?'disabled':''}`)).join('');
  if(stale)notice='前の選択は残っています。最新の内容を確認してください';
  if(snapshot.pending)notice=snapshot.pending.kind==='write'?'保存中…':snapshot.pending.kind==='inspect'?'読み込み中…':'確認中…';
  $('[data-notice]').innerHTML=notice?`<span>${esc(notice)}</span>${failed?button('再試行','retry')+button('最新を読む','refresh'):''}${stale?button('最新を読む','refresh')+button('選択を戻す','discard-confirm'):''}`:'';
  renderWindow();controls();scroll.forEach(([s,y])=>{const e=$(s);if(e)e.scrollTop=y;});queueMicrotask(updateLayout);
 }
 async function edit(fn){if(blocked())return;const next=clone(plan);fn(next);if(!session.setDraft(next))return;win=dd().phase==='return'?{type:'learning-picker',pinned:true}:null;notice='';render();await session.compare();}
 root.addEventListener('click',async event=>{
  const source=event.target.closest('[data-detail]');
  if(source&&root.contains(source)){clearTimeout(hoverTimer);clearTimeout(leaveTimer);openDetail(source.dataset.detail,source.dataset.origin,true);controls();return;}
  const b=event.target.closest('[data-action]');if(!b){if(event.target.matches('[data-outside]')||(win?.type==='detail'&&event.target.closest('.cw-game')&&!event.target.closest('.cw-popup'))){win=null;renderWindow();}return;}
  if(b.disabled)return;const action=b.dataset.action,id=b.dataset.id,base=b.dataset.base;
  if(action.startsWith('nav-')){section=action.slice(4);win=null;render();return;}
  if(action==='close'){win=null;renderWindow();return;}if(action==='pin'){win.pinned=!win.pinned;renderWindow();controls();return;}
  if(action==='return-pick'||action==='return-compare'){
   win={type:'learning-picker',pinned:true};render();return;
  }
  if(action==='review'){
   if(blocked())return;
   win={type:'review',pinned:true};render();await session.compare();return;
  }
  if(action==='ack'){await session.ackReturn();return;}
  if(action==='candidate'||action==='skip'){await edit(p=>{p.next_preparation.deck=p.next_preparation.deck.filter(x=>x!=='$purchase');p.next_preparation.equipment=p.next_preparation.equipment.filter(x=>x!=='$purchase');p.candidate=action==='skip'||p.candidate===id?null:id;});return;}
  if(action==='learning'){await edit(p=>{const learnt=home().economy.learned.some(x=>x.base===base);if(learnt){if(p.cancel_learning.includes(base)){p.cancel_learning=p.cancel_learning.filter(x=>x!==base);p.retain_learning.push(base);}else{p.retain_learning=p.retain_learning.filter(x=>x!==base);p.cancel_learning.push(base);p.next_preparation.equipment=p.next_preparation.equipment.filter(x=>detail(x).base_id!==base);}}else{const a=p.next_preparation.learn;if(a.includes(base)){p.next_preparation.learn=a.filter(x=>x!==base);p.next_preparation.equipment=p.next_preparation.equipment.filter(x=>detail(x).base_id!==base);}else a.push(base);}});return;}
  if(action==='deck-add'||action==='deck-remove'){await edit(p=>{const a=p.next_preparation.deck;if(action==='deck-add')a.push(id);else{const n=a.indexOf(id);if(n>=0)a.splice(n,1);}});return;}
  if(action==='equip'){await edit(p=>{const a=p.next_preparation.equipment;p.next_preparation.equipment=a.includes(id)?a.filter(x=>x!==id):[...a,id];});return;}
  if(action==='discard-confirm'){win={type:'discard',pinned:true};renderWindow();controls();return;}
  if(action==='retry'){await session.retry();return;}
  if(action==='refresh'){await session.refresh();return;}
  if(action==='quote'){if(unsaved()){notice='先に選択を保存してください';render();return;}win={type:'conversion',id,pinned:true};await session.quote([id]);return;}
  const command={commit:['commit_preparation',{plan}], 'save-draft':['save_draft',{plan}],discard:['discard_draft',{}],convert:['convert_items',{item_ids:[id]}],depart:['depart',{case_id:dd().case?.id}],lock:['set_item_lock',{item_id:id,locked:!home()?.owned.find(o=>o.id===id)?.locked}], 'conversion-recover':['save_draft',{plan}]}[action];
  if(command){if(action==='depart'&&dirty()){notice='選んだ変更を確認してください';render();return;}await session.execute(...command);}
 },{signal:events.signal});
 root.addEventListener('change',e=>{if(e.target.matches('[data-timing]')&&!blocked()){const p=clone(plan);p.purchase_timing=e.target.value;if(session.setDraft(p))session.compare();}},{signal:events.signal});
 root.addEventListener('mouseover',e=>{if(e.target.closest('.cw-popup')){clearTimeout(leaveTimer);return;}const b=e.target.closest('[data-detail]');if(!b||b.contains(e.relatedTarget)||win?.pinned)return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(!disposed){openDetail(b.dataset.detail,b.dataset.origin,false);controls();}},180);},{signal:events.signal});
 root.addEventListener('mouseout',e=>{const b=e.target.closest('[data-detail]');if(b&&!b.contains(e.relatedTarget))clearTimeout(hoverTimer);if((b||e.target.closest('.cw-popup'))&&!e.relatedTarget?.closest?.('.cw-popup'))leaveTimer=setTimeout(()=>{if(!disposed&&win&&!win.pinned){win=null;renderWindow();}},140);},{signal:events.signal});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&win){win=null;renderWindow();}},{signal:events.signal});
 function updateScrollCue(){const s=$('[data-scroll]'),hint=$('[data-scroll-hint]');if(s&&hint)hint.hidden=s.scrollHeight-s.scrollTop<=s.clientHeight+4;}
function positionDetail(){
 if(win?.type!=='detail')return;
 const source=[...root.querySelectorAll('[data-detail]')].find(n=>n.dataset.detail===win.id),layer=$('.cw-detail-layer');
 const g=$('.cw-game').getBoundingClientRect(),r=source?.getBoundingClientRect();
 if(layer)layer.style.justifyItems=r&&r.left-g.left>g.width/2?'start':'end';
}
function updateLayout(){
 const game=$('.cw-game'),g=game.getBoundingClientRect();
 if(g.height>0){
  const top=$('[data-top]').getBoundingClientRect(),foot=$('[data-footer]').getBoundingClientRect(),message=$('[data-notice]').getBoundingClientRect();
  const lower=message.height>0?Math.min(message.top,foot.top):foot.top;
  game.style.setProperty('--cw-detail-top',Math.ceil(top.bottom-g.top+8)+'px');
  game.style.setProperty('--cw-detail-bottom',Math.ceil(g.bottom-lower+8)+'px');
 }
 updateScrollCue();positionDetail();
}

 const observer=new ResizeObserver(updateLayout);for(const s of ['.cw-game','[data-top]','[data-workspace]','[data-notice]','[data-footer]'])observer.observe($(s));
 root.addEventListener('scroll',updateScrollCue,{capture:true,signal:events.signal});
 const unsubscribe=session.subscribe(s=>{snapshot=s;if(!s.view)return;const next=s.view;
  if(previousToken!==next.meta.view_token&&!s.stale){win=null;section=next.display_data.phase==='return'?'return':section==='return'?'deck':section;}
  if(s.error&&s.canRetry)win=null;
  previousToken=next.meta.view_token;view=next;plan=s.draft;comparison=s.comparison;quote=s.quote;stale=s.stale;failed=s.canRetry;oldDetails=s.draftDetails;notice=s.error?errorText(s.error):'';render();});
 return {dispose(){disposed=true;clearTimeout(hoverTimer);clearTimeout(leaveTimer);events.abort();observer.disconnect();unsubscribe();root.replaceChildren();root.classList.remove('cw-m1');}};
};})(globalThis.CrossweaveUI);

/* Human labels for public card properties. The normal recovery path is implicit. */
(function(api){'use strict';
 // Formatting public prose, not a catalogue keyed by hidden IDs or names.
 // Unrecognised wording remains intact; no condition or number is inferred.
 api.explanationLines=text=>String(text||'').replace(/他主体由来/g,'他者由来')
  .replace(/直前の本人行動が/g,'直前：').replace(/で、今回が/g,'。今回：')
  .replace(/し、その後に/g,'。その後に')
  .replace(/を(\d+)加算/g,' +$1').replace(/を(\d+)短縮/g,' −$1').replace(/を(\d+)延長/g,' +$1')
  .split(/[／\n]|。(?=.)/u).map(s=>s.trim().replace(/。$/u,'')).filter(Boolean);
 api.effectRows=detail=>{
  const rows=[],add=(label,text)=>{const lines=api.explanationLines(text);if(lines.length)rows.push({label,lines});};
  add('条件',detail?.trigger_text);add('効果',detail?.effect_text);
  const p=detail?.primary||detail;
  if(p?.kind==='defense_support'){
   add('対象','使用者以外の活動中の全主体');
   add('重複','同じ発生源の付与は張り直し');
  }
  const uses=p?.defense_grant&&Object.hasOwn(p.defense_grant,'uses')?p.defense_grant.uses:p?.defense_uses;
  if(uses!==undefined)add('持続',uses===null?'回数制限なし':uses+'回');
  add('性質',({consumed_on_recovery:'回収時に消滅',destroyed_on_recovery_retired_origin:'回収時に消滅（元の主体が離脱）',destroyed_on_recovery_filler:'回収時に消滅'})[detail?.recovery_rule]);
  return rows;
 };
 api.effectHTML=detail=>{
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rows=api.effectRows(detail);if(!rows.length)return '';
  return '<dl class="cw-effect-structure">'+rows.map(({label,lines})=>'<div><dt>'+esc(label)+'：</dt><dd>'+lines.map(s=>'<span>'+esc(s)+'</span>').join('')+'</dd></div>').join('')+'</dl>';
 };
 api.cardProperties=detail=>{
  const recovery={consumed_on_recovery:'回収時に消滅',destroyed_on_recovery_retired_origin:'回収時に消滅（元の主体が離脱）',destroyed_on_recovery_filler:'回収時に消滅'}[detail?.recovery_rule];
  const p=detail?.primary||detail;
  const grant=p?.kind==='defense_support'?'使用者以外の活動中の全主体へ付与。同じ発生源からの付与は張り直す。':null;
  const uses=p?.defense_grant&&Object.hasOwn(p.defense_grant,'uses')?p.defense_grant.uses:p?.defense_uses;
  const duration=uses!==undefined?'防御の回数：'+(uses===null?'制限なし':uses+'回'):null;
  return [...new Set([detail?.trigger_text,detail?.effect_text,grant,duration,recovery].filter(t=>typeof t==='string'&&t.trim()))];
 };
 api.defenseDuration=d=>!d||d.status==='empty'?'':d.status==='uniform'?'×'+d.uniform_uses:d.status==='unlimited'?'∞':'混在';
})(globalThis.CrossweaveUI);

/* Display projection only: consume public preview results, never replay combat.
 * A missing result is unknown, not a fabricated zero or a local rules estimate. */
(function(api){'use strict';
 api.projectReservations=function(data,preview){
  const x=data?.exploration;if(!x||!preview?.supported||!Number.isFinite(preview.next_self_reservation)||!Array.isArray(preview.current_reservations))return null;
  const self=x.self.id;
  const rows=preview.current_reservations.filter(r=>r.actor!==self&&preview.actor_changes?.[r.actor]?.active?.after!==false).map(r=>({...r,nextSelf:false}));
  rows.push({actor:self,at:preview.next_self_reservation,nextSelf:true});
  const groups=[];
  // Same-time reservations share a group; do not invent their future tie order.
  for(const row of rows.sort((a,b)=>a.at-b.at)){let group=groups.at(-1);if(!group||group.at!==row.at)groups.push(group={at:row.at,rows:[]});group.rows.push(row);}
  return groups;
 };
 api.projectActionForecast=function(data,choice,preview){
  if(!preview?.supported||!data?.exploration||!choice)return null;
  const x=data.exploration,hand=Array.isArray(x.hand)?x.hand:Object.values(x.hand||{});
  const card=hand.find(c=>c.id===choice.card_id);if(!card)return null;
  const result={actors:{},field:null,unavailable:[],active:{},defense:{}};
  for(const [id,row] of Object.entries(preview.actor_changes||{})){
   result.actors[id]={};
   for(const [key,source] of Object.entries({hp:'hp',posture:'posture_remaining',guard:'guard',crit:'crit',critical:'critical_multiplier',evasion:'evasion',reduction:'reduction'})){
    const v=row.values?.[source];
    result.actors[id][key]=row.status==='known'&&v?.status==='known'?{...v}:{status:row.status==='known'?'unsupported':'unknown'};
   }
   result.active[id]=row.active;result.defense[id]=row.defense;
  }
  const change=(id,key,before,after)=>{if(!Number.isFinite(before)||!Number.isFinite(after))return;result.actors[id]??={};result.actors[id][key]={status:'known',before,after,delta:after-before};};
  const subject=id=>x.actors[id]||Object.values(x.actors).find(a=>a.id===id);
  const self=x.self,target=subject(choice.target);
  if(preview.mode==='attack'&&target&&preview.actor_changes?.[target.id]?.status==='known'){
   // Show the strike before reset, directly from the already resolved hit_gain.
   // This is a display subtraction, not a second combat/evasion calculation.
   if(Number.isFinite(preview.posture_before)&&Number.isFinite(preview.hit_gain))change(target.id,'posture',preview.posture_before,preview.posture_before-preview.hit_gain);
  }
  if(preview.mode==='place'){
   const detail=data.details?.[card.id];
   if(detail?.field)result.field={kind:'place',attr:card.attr,id:card.id,name:detail.name,power:detail.field.power,hit:detail.field.hit};
  }else if(preview.matched_field_id)result.field={kind:'consume',id:preview.matched_field_id,attr:card.attr};
  return result;
 };
})(globalThis.CrossweaveUI);

/* UI-R-002 v0.15 layout/gestures, projected exclusively from CW-M1-view-1.
 * No game object, card registry, economy, saved document, or speculative actor AI.
 */
(function(api){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const list=x=>Array.isArray(x)?x:Object.values(x||{});
 const glyph=kind=>({attack:'↗',guard:'◇',defense_support:'◇',heal:'✚',self:'●',passage:'≈',terminal:'▥',optional_enemy:'◈'})[kind]||'◇';
 const icon=kind=>`<span aria-hidden="true">${glyph(kind)}</span>`;
 const symbol=(name,fallback='◇')=>`<i data-lucide="${name}" aria-hidden="true">${fallback}</i>`;
 const menuButton=(kind,name,shape)=>`<button type="button" data-x="${kind}" aria-label="${name}" data-tooltip="${name}">${symbol(shape,({info:'i',flag:'⚑',activity:'◎','list-ordered':'≡',layers:'▤',history:'↶','sliders-horizontal':'⚙','message-square':'…','book-open':'▣',menu:'☰'})[shape])}<span>${name}</span></button>`;
 api.mountExploration=function(root,{session,display_data,onScene,onWithdraw,onCommon}){
  let data=display_data,state=session.state(),selected=null,target=null,windowState=null,windowParent=null,parentRect=null,previewChoice=null;
  let previousToken=null,reservationToken=null,dead=false,drag=null,actorPress=null,suppressUntil=0,hoverTimer=null,leaveTimer=null,forecast=null,lastShownTarget=null,lastShownReservation=null,gestureEpoch=0;
  const fhd=!!root.closest('[data-display="fhd"]');
  let pan=null,autoScrollFrame=null;
  const settings={diagram:true,details:true,quick:true,drag:true,hold:220};
  const events=new AbortController(),timers=new Set();
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);if(!dead)fn();},ms);timers.add(t);return t;};
  let historyCursor=list(display_data.exploration?.public_history).length,feedTimer=null;
  const feedQueue=[],feedVisible=[];
  root.classList.add('cw-explore');root.setAttribute('aria-label','crossweave 探索');
  root.innerHTML=`${api.commonNavigationHTML(onCommon?'data-j':'data-x',onCommon?'menu':'more')}<div id="cw-scene" aria-hidden="true"><div id="cw-scene-base"></div></div>
   <section class="cw-region cw-world" aria-label="相手と環境"><div class="cw-heading"><div class="cw-order-strip"><ol id="cw-turn-order" aria-label="現在の行動予約"></ol></div></div><div class="cw-scroll" id="cw-actors"></div><div class="cw-scroll-help" data-track="cw-actors"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-board" id="cw-drop-zone" aria-label="札を出す場"><div class="cw-heading"><span id="cw-match-label"></span></div><div class="cw-scroll" id="cw-field"></div><div class="cw-scroll-help" data-track="cw-field"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-hand-region" aria-label="手札"><div class="cw-heading"><span id="cw-notice" role="status"></span></div><div class="cw-scroll" id="cw-hand"></div><div class="cw-scroll-help" data-track="cw-hand"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div><div id="cw-action-track"><div class="cw-actions" id="cw-action-anchor" hidden><button type="button" data-x="preview">予測</button><button type="button" id="cw-use" data-x="use" class="cw-primary">場に出す</button></div></div></section>
   <footer class="cw-bottom"><div class="cw-footer-state"><div class="cw-self" id="cw-self" aria-label="本人の状態"></div><span id="cw-hand-count"></span></div><button type="button" data-x="withdraw">撤退</button></footer>
   <div class="cw-event-region" aria-label="直前の行動"><ol id="cw-event-feed" aria-live="polite" aria-relevant="additions"></ol></div>
   <svg id="cw-relations" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden></svg><div id="cw-drag-ghost" class="cw-card-face" aria-hidden="true" hidden></div>
   <section class="cw-drawer" id="cw-drawer" role="dialog" aria-label="詳細" hidden><header><button type="button" data-x="window-back" aria-label="元の窓に戻る" hidden>${symbol('arrow-left','←')}</button><strong id="cw-drawer-title"></strong><button type="button" data-x="pin" aria-label="固定する" id="cw-window-state">${symbol('pin','📌')}</button><button type="button" data-x="close" aria-label="詳細を閉じる">×</button></header><div class="cw-drawer-body"></div></section>
   <section class="cw-drawer" id="cw-parent-drawer" role="dialog" aria-label="探索メニュー" hidden><header><strong></strong><button type="button" data-x="parent-pin" aria-label="固定する">${symbol('pin','📌')}</button><button type="button" data-x="parent-close" aria-label="窓を閉じる">×</button></header><div class="cw-drawer-body"></div></section>`;
  const $=s=>root.querySelector(s),x=()=>data.exploration,details=id=>data.details?.[id];
  const holdCue=globalThis.CrossweaveHoldCue.mount(root,{scale:()=>api.displayScale(root)});
  const hand=()=>list(x()?.hand),field=()=>list(x()?.field),actors=()=>list(x()?.actors).filter(a=>a.active);
  const card=()=>hand().find(c=>c.id===selected),actor=id=>x()?.actors?.[id]||list(x()?.actors).find(a=>a.id===id);
  const names=id=>details(id)?.name||actor(id)?.name||'札';
  // Presentation terms follow the formal glossary v1.3. Runtime stat_labels
  // still calls accumulated crit an event (一閃); do not repeat that mismatch.
  const label=(key,fallback)=>({crit:'機転',crit_gain:'機転',posture:'隠蔽',reduction:'軽減'})[key]||data.stat_labels?.[key]||fallback;
  const statDefs={power:['arrow-up-right','↗','突破'],hit:['scan-search','⌖','探査'],crit:['zap','ϟ','機転'],critical:['sparkles','✦','一閃'],guard:['shield','◇','身構'],evasion:['wind','≋','攪乱'],reduction:['shield-minus','−','軽減'],heal:['heart-plus','+','回復'],hp:['heart','♡','余力'],posture:['venetian-mask','◒','隠蔽']};
  const statExplanation={guard:'身構の合計。回数と発生源は詳細で確認',critical:'現在の一閃倍率'};
  const term=key=>symbol(statDefs[key][0],statDefs[key][1])+esc(label(key,statDefs[key][2]));
  const signed=n=>n>0?'+'+n:n<0?'−'+Math.abs(n):'±0';
  const delta=d=>d&&!Number.isFinite(d.delta)?'<small class="cw-delta" aria-label="予測未公開">?</small>':d?`<small class="cw-delta" data-delta="${d.delta}" aria-label="予測 ${signed(d.delta)}、変更後 ${d.after}">${esc(signed(d.delta))}</small>`:'';
  const stat=(key,value,d=null,maximum=null)=>`<span class="cw-stat" data-stat="${key}" aria-label="${esc(label(key,statDefs[key][2]))} ${esc(value??'—')}${maximum!=null?' / '+esc(maximum):''}" data-tooltip="${esc(statExplanation[key]||label(key,statDefs[key][2]))}${maximum!=null?' '+esc(value)+' / '+esc(maximum):''}">${symbol(statDefs[key][0],statDefs[key][1])}<b>${esc(value??'—')}</b>${delta(d)}</span>`;
  const forecastKey=(q=choice())=>q?JSON.stringify([state.view.meta.view_token,q]):null;
  const projected=()=>forecast?.key===forecastKey()?api.projectActionForecast(data,choice(),forecast.value):null;
  const actorStats=a=>{const p=projected()?.actors[a.id];return '<span class="cw-actor-stats">'+['guard','crit','evasion'].map(k=>stat(k,k==='guard'?a.defense?.guard??a.guard?.value??0:a[k],p?.[k])).join('')+'</span>';};
  const vitals=a=>{const p=projected()?.actors[a.id];return `<span class="cw-vitals">${stat('hp',a.hp,p?.hp,a.max_hp)}${stat('posture',a.posture_remaining,p?.posture,a.max_posture)}</span><span class="cw-vital-bars"><progress value="${a.hp}" max="${a.max_hp}" aria-label="${esc(a.remaining_label||'余力')}"></progress><progress value="${a.posture_remaining}" max="${a.max_posture}" aria-label="隠蔽"></progress></span>`;};
  const busy=()=>['write','inspect'].includes(state.pending?.kind)||state.canRetry||state.stale;
  const choicesFor=id=>list(x()?.legal_actions).map(a=>a.choice??a).filter(a=>a.card_id===id);
  const choices=()=>choicesFor(selected);
  const choice=()=>choices().find(a=>a.target===target)||choices().find(a=>a.target===null)||null;
  // Keep the player's target across turns, as in formal v0.15. Derive a first
  // target only from public legal choices, preferring the passage when present.
  function targetFor(legal){
   const allowed=legal.filter(a=>a.target!==null).map(a=>a.target),candidates=actors().filter(a=>a.id!==x().self.id&&(!allowed.length||allowed.includes(a.id)));
   return candidates.some(a=>a.id===target)?target:candidates.find(a=>a.purpose==='passage')?.id??candidates[0]?.id??null;
  }
  function retainTarget(legal=choices()){target=targetFor(legal);}
  const actionLabel=(c,q)=>q?q.target?(actor(q.target)?.action_label||'攻撃'):field().some(f=>f.attr===c.attr)?(c.kind==='guard'?label('guard','身構'):c.kind==='heal'?'回復':c.kind==='defense_support'?'付与':'一致して使う'):'場に置く':'対象を選択';
  function handActionLabel(id){const c=hand().find(h=>h.id===id),legal=choicesFor(id),t=targetFor(legal);return actionLabel(c,legal.find(a=>a.target===t)||legal.find(a=>a.target===null));}
  function requestForecast(retry=false){
   const q=choice(),key=forecastKey(q);if(!q||busy())return Promise.resolve(null);
   if(forecast?.key===key&&!(retry&&forecast.failed))return forecast.promise;
   // Claim the key before notifying Session. It may synchronously rerender us.
   const job=forecast={key,value:null,promise:null};
   job.promise=Promise.resolve().then(async()=>{
    if(dead||forecast!==job||forecastKey()!==key||busy())return null;
    const r=await session.previewAction(q);
    if(dead||forecast!==job||forecastKey()!==key)return null;
    job.value=r.ok?r.value:null;job.failed=!r.ok;redraw();return job.value;
   });return job.promise;
  }
  const actorIcon=a=>a?.purpose==='passage'?symbol('mountain','△'):icon(a?.purpose);
  const art=(kind,k,entity=null)=>{const a=kind==='actors'?api.actorArtwork?.(data,entity):null;return `<span class="cw-illustration" data-art-kind="${kind}" ${kind==='actors'&&entity?.purpose==='passage'?'data-terrain':''} ${a?`data-artwork="${a.id}"`: ''} aria-hidden="true">${a?`<img src="${a.src}" width="${a.width}" height="${a.height}" alt="" draggable="false">`:kind==='actors'?actorIcon(entity):icon(k)}</span>`;};
  const attribute=c=>`<span class="cw-attr">${esc(c.attr)}</span>`;
  const cardFace=(kind,name,values,attr,meta='')=>art('cards',kind)+`<span class="cw-face-caption"><strong>${esc(name)}</strong><span class="cw-stat-line">${values}</span><span class="cw-hand-meta">${attribute({attr})}${meta}</span></span>`;
  const main=c=>{const p=details(c.id)?.primary;if(!p)return '詳細未提供';if(p.kind==='defense_support')return stat('guard',p.defense_grant?.guard)+stat('evasion',p.defense_grant?.evasion)+'<small>全員付与</small>';return stat(p.kind==='guard'?'guard':p.kind==='heal'?'heal':'power',p.power)+stat(p.kind==='guard'?'evasion':'hit',p.kind==='guard'?p.evasion:p.hit);};
  function cardDetails(id){const d=details(id);if(!d)return '<p>この詳細はまだ公開されていません</p>';
   const p=d.primary,f=d.field,rows=[],h=hand().find(c=>c.id===id),match=h&&field().find(c=>c.attr===h.attr);
   const add=(key,v,extra)=>{if(v!=null)rows.push(`<dt>${term(key)}</dt><dd>${esc(v)}${extra!=null?` <small data-field-contribution>+ ${esc(extra)}（場）</small>`:''}</dd>`);};
   if(p?.kind==='defense_support'){add('guard',p.defense_grant?.guard,match?.field_power);add('evasion',p.defense_grant?.evasion,match?.field_hit);add('crit',p.crit_gain);}else if(p){add(p.kind==='guard'?'guard':p.kind==='heal'?'heal':'power',p.power,p.kind==='heal'?null:match?.field_power);if(p.kind!=='heal')add(p.kind==='guard'?'evasion':'hit',p.kind==='guard'?p.evasion:p.hit,match?.field_hit);add('crit',p.crit_gain);}
   const properties=api.effectHTML(d);
   return `<dl class="cw-ledger cw-card-primary">${rows.join('')}</dl>${f?`<h3>場に置くと</h3><dl class="cw-ledger"><dt>${term('power')}／${term('guard')}</dt><dd>${esc(f.power)}</dd><dt>${term('hit')}／${term('evasion')}</dt><dd>${esc(f.hit)}</dd></dl>`:''}<h3>次の行動まで</h3><dl class="cw-ledger"><dt>置く</dt><dd>${esc(d.action_intervals?.place??'—')}</dd><dt>一致</dt><dd>${esc(d.action_intervals?.match??'—')}</dd></dl>${properties}`;
  }
  function prediction(){const p=forecast?.key===forecastKey()?forecast.value:null;if(!p)return forecast?.failed?'<p>予測を取得できませんでした</p>':'<p>予測を確認中…</p>';
   if(!p.supported)return '<p>この行動は予測に未対応です</p>';
   const rows=[['次の行動まで',p.action_cost]];
   if(p.mode==='attack'){rows.push(['対象の余力',signed(-p.actual_hp_loss)],['隠蔽',p.posture_before+' → '+(p.posture_before-p.hit_gain)]);}
   if(p.mode==='heal')rows.push(['回復',p.hp_restored]);
   if(p.mode==='guard')rows.push([label('guard','身構'),p.guard?.value],[label('evasion','攪乱')+'（この身構）',p.guard?.evasion]);
   if(p.mode==='defense_support')rows.push(['対象','使用者以外の全員']);
   const changes=api.projectActionForecast(data,choice(),p);
   for(const a of actors()){const values=changes?.actors[a.id];if(!values)continue;for(const k of ['guard','crit','critical','evasion']){const v=values[k];if(v?.status!=='known')rows.push([a.name+' '+label(k,statDefs[k][2]),'未公開']);else if(v.delta)rows.push([a.name+' '+label(k,statDefs[k][2]),v.before+' → '+v.after]);}}
   if(p.mode==='place')rows.push(['主効果','発動なし']);
   const expiry=(p.unused_hand_expiry||[]).filter(a=>a.expires);
   return `<dl class="cw-ledger">${rows.filter(([,v])=>v!=null).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${expiry.length?`<p class="cw-loss">期限切れ：${expiry.map(a=>`${esc(names(a.id))}${a.destination==='destroyed'?'（消滅）':''}`).join('、')}</p>`:''}`;
  }
  function eventText(r){
   const action=r.mode==='attack'?`${names(r.target)} ${actor(r.target)?.remaining_label||'残量'} −${r.actual_hp_loss}`:r.mode==='guard'?label('guard','身構'):r.mode==='heal'?`回復 +${r.hp_restored}`:r.mode==='defense_support'?'全員へ防御付与':'設置';
   const name=r.card_name_status==='recorded_at_resolution'?r.card_name:null;
   return r.type==='action'?`${names(r.actor)} · ${name?'「'+name+'」':'札（名称未記録）'} · ${action}`:'場面が変化';
  }
  function history(){return list(x()?.public_history).slice().reverse().map(r=>`<li class="cw-log"><time>${esc(r.time)}</time> ${esc(eventText(r))}</li>`).join('')||'<li>まだ履歴がありません</li>';}
  // Public resolved events only. Opening/resizing the UI never replays old history.
  // Timing follows the formal feed; at most two rows protect the compact layout.
  function pumpEvent(){
   feedTimer=null;if(!feedQueue.length||feedVisible.length>=2)return;
   const row=feedQueue.shift(),node=document.createElement('li');node.className='cw-live-event';node.innerHTML=`<time>${esc(row.time)}</time><span>${esc(row.text)}</span>`;
   feedVisible.push(node);$('#cw-event-feed').prepend(node);feedVisible.forEach((el,i)=>el.style.bottom=i*(fhd?40:26)+'px');
   later(()=>{node.dataset.fading='true';},1300);
   later(()=>{const i=feedVisible.indexOf(node);if(i>=0)feedVisible.splice(i,1);node.remove();feedVisible.forEach((el,j)=>el.style.bottom=j*(fhd?40:26)+'px');if(feedTimer===null)pumpEvent();},2800);
   feedTimer=later(pumpEvent,260);
  }
  function updateEvents(){const rows=list(x()?.public_history);if(rows.length<historyCursor){feedQueue.length=0;feedVisible.splice(0).forEach(el=>el.remove());historyCursor=rows.length;return;}
   feedQueue.push(...rows.slice(historyCursor).map(r=>({time:r.time,text:eventText(r)})));historyCursor=rows.length;if(feedTimer===null)pumpEvent();
  }
  function windowContent(w=windowState,popup=$('#cw-drawer')){if(!w)return;
   const fieldForecast=projected()?.field,isForecast=w.type==='preview'||w.type==='field'&&fieldForecast?.kind==='place'&&fieldForecast.id===w.id;
   let title='',body='';
   if(['card','field','preview'].includes(w.type)){title=names(w.id);body=w.type==='preview'?prediction():cardDetails(w.id);}
   if(w.type==='actor'){const a=actor(w.id);title=a?.name||'相手';body=a?`<p>${esc(a.remaining_label)} ${a.hp}/${a.max_hp} · 隠蔽 ${a.posture_remaining}/${a.max_posture}</p><dl class="cw-ledger">${['guard','crit','evasion'].map(k=>`<dt>${term(k)}</dt><dd>${esc(k==='guard'?a.defense?.guard??a.guard?.value??0:a[k])}</dd>`).join('')}</dl>`+(a.defense?.effects.length?'<h3>防御の内訳</h3><p>身構 '+esc(api.defenseDuration(a.defense.duration.guard))+' · 攪乱 '+esc(api.defenseDuration(a.defense.duration.evasion))+'</p><ul>'+a.defense.effects.map(e=>'<li>'+esc(names(e.source_actor_id))+' · 身構 '+e.guard+' / 攪乱 '+e.evasion+' · '+(e.uses===null?'回数制限なし':e.uses+'回')+'</li>').join('')+'</ul>':'')+(a.knowledge_key&&onCommon?'<button type="button" data-x="actor-record" data-key="'+esc(a.knowledge_key)+'">調査記録</button>':''):'<p>この対象は離脱しました</p>';}
   if(w.type==='order'){const predicted=forecast?.key===forecastKey()?api.projectReservations(data,forecast.value):null,rows=predicted?.flatMap(g=>g.rows)||state.reservations||forecast?.value?.current_reservations;title=predicted?'行動後の予約':'行動予約';body=rows?`<ol class="cw-reservations">${rows.map(r=>`<li ${r.nextSelf?'data-self-next':''}><span>${esc(names(r.actor))}${r.nextSelf?'・次':''}</span><b>${esc(signed(r.at-x().now))}</b></li>`).join('')}</ol>`:'<p>予約の公開応答を確認中…</p>';}
   if(w.type==='more'){title='探索メニュー';body=`<nav class="cw-more">${[['objective','目的','flag'],['status','状況','activity'],['order','行動順','list-ordered'],['deck','山札','layers'],['history','履歴','history'],['texts','文章の記録','book-open'],['records','調査記録','book-open'],['settings','操作','sliders-horizontal'],['menu','設定・保存','settings']].filter(([k])=>onCommon||!['records','menu','texts'].includes(k)).map(args=>menuButton(...args)).join('')}</nav>`;}
   if(w.type==='objective'){title='目的';const t=list(data.texts).find(t=>t.id===data.case?.objective_text_id);body=`<p>${esc(t?.short_text||'目的の本文はまだ公開されていません')}</p>`;}
   if(w.type==='status'){title='状況';body=`<p>時刻 ${x().now} · 本人の行動 ${x().self.actions}回</p>`+actors().map(a=>`<p>${esc(a.name)}：${esc(a.remaining_label)} ${a.hp}/${a.max_hp} · ${label('crit','一閃')} ${a.crit}</p>`).join('');}
   if(w.type==='deck'){title='本人の札';body=`<p>山札 ${x().self.deck_count}枚 · 手札 ${hand().length}枚 · 共有回収 ${x().recovery_count}枚</p><table class="cw-deck-table"><thead><tr><th>札</th><th>持込</th><th>山札</th><th>手札</th></tr></thead><tbody>${(x().deck_catalogue?.entries||[]).map(r=>`<tr><td><button type="button" data-x="deck-detail" data-id="${esc(r.detail_id)}">${esc(details(r.detail_id)?.name||r.card?.name||'札')}</button></td><td>${r.initial_count??'—'}</td><td>${r.deck_count}${r.doomed_deck_count?`<small>（消滅予定${r.doomed_deck_count}）</small>`:''}</td><td>${r.hand_count}${r.doomed_hand_count?`<small>（消滅予定${r.doomed_hand_count}）</small>`:''}</td></tr>`).join('')}</tbody></table><p>相手の現在の内訳・共有回収の内訳は未公開</p>`;}
   if(w.type==='history'){title='履歴';body=`<ol>${history()}</ol>`;}
   if(w.type==='settings'){title='操作';body=`<p>札も相手もクリックで選択・詳細。相手を選ぶと行動の対象も切り替わります。札を短く押し続けて場へ運ぶと出札できます。押してすぐ横へ動かすと手札を送ります。</p>${[['diagram','関係線を表示'],['details','選択時に詳細を開く'],['quick','通常の設置をすぐ実行'],['drag','ドラッグを使う']].map(([k,l])=>`<label><input type="checkbox" data-x-setting="${k}" ${settings[k]?'checked':''}> ${l}</label>`).join('')}<label>つかむまで <select data-x-hold><option value="150">0.15秒</option><option value="220">0.22秒</option><option value="320">0.32秒</option></select></label>`;}
   const bodyNode=popup.querySelector('.cw-drawer-body'),key=w.type+':'+w.id,same=bodyNode.dataset.content===key,scroll=same?bodyNode.scrollTop:0;
   const heading=(isForecast?'予測 · ':'')+title;
   popup.querySelector('header strong').textContent=heading;bodyNode.innerHTML=body;bodyNode.dataset.content=key;bodyNode.scrollTop=scroll;
   popup.hidden=false;popup.dataset.window=w.type;popup.setAttribute('aria-label',heading);
   const pin=popup.querySelector('[data-x="pin"],[data-x="parent-pin"]');pin.innerHTML=symbol('pin','📌');pin.setAttribute('aria-pressed',String(w.pinned));pin.setAttribute('aria-label',w.pinned?'固定を外す':'固定する');pin.dataset.tooltip=w.pinned?'固定を外す':'固定する';
   if(popup.id==='cw-drawer'){
    $('[data-x="preview"]').setAttribute('aria-expanded',String(w.type==='preview'));
    $('[data-x="window-back"]').hidden=!windowParent;
    $('#cw-parent-drawer').hidden=!windowParent;
    if(windowParent)windowContent(windowParent,$('#cw-parent-drawer'));
   }
   if(w.type==='settings')$('[data-x-hold]').value=String(settings.hold);
   if(typeof lucide!=='undefined')lucide.createIcons({attrs:{width:16,height:16}});
  }
  function close(){clearTimeout(hoverTimer);clearTimeout(leaveTimer);windowState=null;windowParent=null;parentRect=null;$('#cw-parent-drawer').hidden=true;$('#cw-drawer').hidden=true;$('[data-x="preview"]').setAttribute('aria-expanded','false');$('.cw-drawer-body').dataset.content='';layout();}
  function backWindow(){if(windowParent){windowState=windowParent;windowParent=null;parentRect=null;windowContent();layout();}else close();}
  function open(type,id=null,pinned=true,source=null){
   if(windowState?.pinned&&!pinned)return;
   gestureEpoch++;clearTimeout(hoverTimer);clearTimeout(leaveTimer);cancelDrag();
   cancelActorPress(true);
   if(source){if(windowState?.type==='more'){windowParent={...windowState};const a=api.uiRect(source,root);parentRect=a?{left:a.x,top:a.y,width:a.w,height:a.h}:null;}}
   else {windowParent=null;parentRect=null;}
   if(pinned&&windowState?.type===type&&windowState.id===id){if(windowState.pinned){close();return;}windowState.pinned=true;}
   else windowState={type,id,pinned};
   windowContent();layout();
  }
  function redraw(){if(dead||!x())return;const c=card();
   const scrolls=['cw-actors','cw-field','cw-hand','cw-turn-order'].map(id=>[id,$('#'+id).scrollLeft]);
   root.dataset.cardDrag=String(settings.drag);root.setAttribute('aria-busy',String(!!state.pending));
   $('#cw-actors').innerHTML=actors().filter(a=>a.id!==x().self.id).map(a=>`<article class="cw-actor-item"><button type="button" class="cw-actor" data-x-actor="${esc(a.id)}" aria-label="${target===a.id?'対象：':''}${esc(a.name)}。クリックで選択・詳細" aria-pressed="${target===a.id}">${art('actors',a.purpose,a)}<span class="cw-face-caption"><strong>${target===a.id?`<span class="cw-target-mark" aria-hidden="true">${symbol('crosshair','⊕')}</span>`:''}${esc(a.name)}</strong>${vitals(a)}${actorStats(a)}</span></button></article>`).join('');
   const attrs=[...new Set([...field().map(c=>c.attr),...hand().map(c=>c.attr)])];
   const fieldPrediction=projected()?.field;
   $('#cw-field').innerHTML=attrs.map(attr=>{const f=field().find(f=>f.attr===attr),ghost=!f&&fieldPrediction?.kind==='place'&&fieldPrediction.attr===attr?fieldPrediction:null,consumes=f&&fieldPrediction?.kind==='consume'&&fieldPrediction.id===f.id,tag=f||ghost?'button':'div',guard=['guard','defense_support'].includes(c?.kind)&&c.attr===attr;return `<${tag} ${f||ghost?`type="button" data-x-field="${esc(f?.id||ghost.id)}" aria-label="${esc(f?names(f.id):ghost.name)}${ghost?'。予測の場札':''}。詳細"`:''} class="cw-slot${f||ghost?' cw-card-face':''}${ghost?' cw-field-forecast':''}" data-x-attr="${esc(attr)}" data-linked="${c?.attr===attr}" data-forecast="${ghost?'place':consumes?'consume':''}">${f||ghost?cardFace(f?.kind||c?.kind,f?names(f.id):ghost.name,stat(guard?'guard':'power',f?f.field_power:ghost.power)+stat(guard?'evasion':'hit',f?f.field_hit:ghost.hit),attr):`<span class="cw-face-caption"><strong>${esc(attr)}</strong></span>`}${ghost||consumes?`<small class="cw-field-change">${ghost?'＋ 予測':'使用後に場から離れる'}</small>`:''}</${tag}>`;}).join('');
   $('#cw-hand').innerHTML=hand().map(h=>`<article class="cw-hand-card" data-selected="${h.id===selected}"><button type="button" class="cw-select cw-card-face" data-x-card="${esc(h.id)}" aria-pressed="${h.id===selected}" aria-description="ホールドで出札を準備">${cardFace(h.kind,names(h.id),main(h),h.attr,`<span class="cw-life ${h.remaining===1?'cw-loss':''}">${h.remaining===1?'今回まで':'あと'+h.remaining+'行動'}</span>`)}</button></article>`).join('');
   const reservations=state.reservations||forecast?.value?.current_reservations;
   const predicted=forecast?.key===forecastKey()?api.projectReservations(data,forecast.value):null;
   const turnFace=r=>{const a=api.actorArtwork?.(data,actor(r.actor));return `<button type="button" data-x-order="${esc(r.actor)}" ${r.nextSelf?'data-self-next':''} aria-label="${esc(names(r.actor))}、${r.nextSelf?'行動後の次回予約':'予約'} +${r.at-x().now}"><span class="cw-turn-face">${a?`<img src="${a.src}" alt="" draggable="false">`:actorIcon(actor(r.actor))}</span>${r.nextSelf?'<b>次</b>':''}</button>`;};
   $('#cw-turn-order').setAttribute('aria-label',predicted?'行動後の本人と現在の相手の予約':'現在の行動予約');
   $('#cw-turn-order').innerHTML=predicted?'<li class="cw-turn-now">本人・今</li>'+predicted.map(g=>`<li class="cw-turn-group" data-at="${g.at}" ${g.rows.length>1?'aria-label="同時刻の予約"':''}>${g.rows.map(turnFace).join('')}<span>+${g.at-x().now}</span></li>`).join(''):reservations?reservations.map(r=>`<li>${turnFace(r)}<span>+${r.at-x().now}</span></li>`).join(''):'<li>行動予約を確認中…</li>';
   const nextIndex=predicted?.findIndex(g=>g.rows.some(r=>r.nextSelf)),nextGroup=nextIndex>=0?predicted[nextIndex]:null;
   const preceding=nextGroup?predicted.slice(0,nextIndex).reduce((n,g)=>n+g.rows.length,0):0;
   const position=nextGroup?(nextGroup.rows.length>1?(preceding+1)+'〜'+(preceding+nextGroup.rows.length):String(preceding+1)):null;
   const forecastButton=$('[data-x="preview"]');forecastButton.innerHTML='<span>予測</span>'+(position?'<small class="cw-next-position" aria-hidden="true">本人→<b>'+position+'</b></small>':'');
   forecastButton.setAttribute('aria-label',position?'予測。現在の予約では、本人の次は'+position+'番目':'予測');
   $('#cw-self').innerHTML=vitals(x().self)+actorStats(x().self);$('#cw-hand-count').textContent=`手札 ${hand().length}枚`;
   const match=c&&field().some(f=>f.attr===c.attr);$('#cw-match-label').textContent=c?c.attr+' · '+(match?'一致':'設置'):'';
   $('#cw-notice').textContent=busy()?'処理中…':state.error?'操作結果を確認してください':c&&choices().length&&!choice()?'対象を選択':'';
   const q=choice(),verb=actionLabel(c,q);
   $('#cw-use').textContent=verb;$('#cw-use').setAttribute('aria-label',q?.target?names(q.target)+'を対象に'+verb:verb);
   $('#cw-use').disabled=busy()||!q||!session.can('play');$('[data-x="preview"]').disabled=(!q||busy())&&windowState?.type!=='preview';
   $('[data-x="preview"]').setAttribute('aria-expanded',String(windowState?.type==='preview'));
   $('[data-x="withdraw"]').disabled=busy()||!session.can('withdraw');
   root.dataset.selection=String(!!c);
   if(windowState?.type==='field'&&![...root.querySelectorAll('[data-x-field]')].some(el=>el.dataset.xField===windowState.id))close();
   if(windowState)windowContent();scrolls.forEach(([id,v])=>$('#'+id).scrollLeft=v);
   root.querySelectorAll('button').forEach(b=>b.classList.add('cursor-interaction'));
   if(typeof lucide!=='undefined')lucide.createIcons({attrs:{width:16,height:16}});queueMicrotask(layout);
   if(q&&!busy())requestForecast();
  }
  function layout(){if(dead)return;const rr=api.uiSpace(root);if(!rr.width||!rr.height)return;
   root.dataset.compact=String(rr.height<410);root.dataset.dense=String(rr.height<280);
   root.style.setProperty('--cw-footer-height',fhd?'72px':'44px');
   const nextButton=$('#cw-turn-order [data-self-next]'),nextKey=nextButton?forecast?.key:null;
   if(nextKey!==lastShownReservation){const row=$('#cw-turn-order'),a=nextButton?.getBoundingClientRect(),r=row.getBoundingClientRect();if(a?.width&&r.width){if(a.left<r.left)row.scrollLeft-=(r.left-a.left)/rr.scale;else if(a.right>r.right)row.scrollLeft+=(a.right-r.right)/rr.scale;}lastShownReservation=nextKey;}

   if(lastShownTarget!==target){const selectedActor=[...root.querySelectorAll('[data-x-actor]')].find(e=>e.dataset.xActor===target),row=$('#cw-actors'),ar=selectedActor?.getBoundingClientRect(),trackRect=row.getBoundingClientRect();if(ar?.width&&trackRect.width){if(ar.left<trackRect.left)row.scrollLeft-=(trackRect.left-ar.left)/rr.scale;else if(ar.right>trackRect.right)row.scrollLeft+=(ar.right-trackRect.right)/rr.scale;}lastShownTarget=target;}
   const node=[...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===selected),cr=node?.getBoundingClientRect(),track=$('#cw-action-track'),tr=track.getBoundingClientRect(),dock=$('#cw-action-anchor');
   dock.hidden=!node;if(node){const width=dock.getBoundingClientRect().width/rr.scale||240;dock.style.left=Math.max(0,Math.min(tr.width/rr.scale-width,((cr.left+cr.right)/2-tr.left)/rr.scale-width/2))+'px';}
   for(const el of root.querySelectorAll('[data-track]')){const row=$('#'+el.dataset.track),overflow=row.scrollWidth>row.clientWidth+2;el.dataset.hidden=String(!overflow);el.querySelector('span').textContent=row.children.length+'件';el.querySelector('button:first-child').disabled=row.scrollLeft<=2;el.querySelector('button:last-child').disabled=row.scrollLeft>=row.scrollWidth-row.clientWidth-2;}
   if(windowState){const popup=$('#cw-drawer'),w=windowState;
    const attr={card:'xCard',preview:'xCard',actor:'xActor',field:'xField',order:'xOrder'}[w.type];
    const source=attr?[...root.querySelectorAll('[data-x-card],[data-x-actor],[data-x-field],[data-x-order]')].find(e=>e.dataset[attr]===w.id):root.querySelector('[data-x="'+w.type+'"]');
    const rect=el=>api.uiRect(el,root);
    const anchor=rect(source);
    const avoid=[rect($('#cw-actors')),!dock.hidden?rect(dock):null,rect($('.cw-bottom'))].filter(Boolean);
    // The shorter actor summary keeps the common 13:12 ratio at a fixed 80%
    // footprint so opening it on every selection leaves the board accessible.
    const actorDetail=fhd&&w.type==='actor';
    const sourceDetail=fhd&&attr&&anchor;
    const p=actorDetail?api.placeActorWindow({width:rr.width,height:rr.height,anchor}):sourceDetail?api.placeEdgeWindow({width:rr.width,height:rr.height,anchor,bottom:rect($('.cw-bottom'))?.y??rr.height}):api.placeWindow({width:rr.width,height:rr.height,anchor,avoid,preferredWidth:fhd?520:320,preferredHeight:fhd?480:260,margin:fhd?16:6,minWidth:144,minHeight:64});
    const place=(el,q)=>Object.assign(el.style,{width:q.width+'px',height:q.height+'px',maxHeight:q.height+'px',top:q.top+'px',left:q.left+'px'});
    if(windowParent){const pair=api.placeWindowPair({width:rr.width,height:rr.height,parent:parentRect||p,preferredWidth:fhd?520:320,preferredHeight:fhd?480:260,margin:fhd?16:8,gap:fhd?16:8});place($('#cw-parent-drawer'),pair[0]);place(popup,pair[1]);}else place(popup,p);
   }
   api.layoutProse(root);drawRelations(rr);
  }
  function drawRelations(rr){const svg=$('#cw-relations'),c=card(),q=choice();svg.replaceChildren();svg.hidden=!settings.diagram||!c;svg.toggleAttribute('hidden',!settings.diagram||!c);if(!settings.diagram||!c)return;
   svg.setAttribute('viewBox',`0 0 ${rr.width} ${rr.height}`);
   const point=(node,track,edge)=>{if(!node)return null;const b=node.getBoundingClientRect(),r=track.getBoundingClientRect();const l=Math.max(b.left,r.left,rr.left),right=Math.min(b.right,r.right,rr.left+rr.width*rr.scale);if(right-l<4)return null;return {x:((l+right)/2-rr.left)/rr.scale,y:((edge==='top'?b.top:b.bottom)-rr.top)/rr.scale};};
   const h=point([...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===c.id),$('#cw-hand'),'top');
   const fNode=[...root.querySelectorAll('[data-x-attr]')].find(e=>e.dataset.xAttr===c.attr),fBottom=point(fNode,$('#cw-field'),'bottom'),fTop=point(fNode,$('#cw-field'),'top');
   const dst=q?.target?[...root.querySelectorAll('[data-x-actor]')].find(e=>e.dataset.xActor===q.target):null;
   const end=dst?point(dst,$('#cw-actors'),'bottom'):null;
   const ns='http://www.w3.org/2000/svg';
   for(const [a,b] of [[h,fBottom],[fTop,end]])if(a&&b){const p=document.createElementNS(ns,'path'),mid=(a.y+b.y)/2;p.setAttribute('d',`M${a.x},${a.y} C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','2');svg.append(p);}
  }
  function showSelection(type,id,previous){if(root.dataset.dense==='true'&&previous!==id)close();redraw();if(settings.details&&root.dataset.dense!=='true'||previous===id)open(type,id,true);}
  async function select(id){if(busy())return;const previous=selected;selected=id;retainTarget();previewChoice=null;showSelection('card',id,previous);}
  function selectActor(id){if(busy())return;const previous=target;target=id;previewChoice=null;showSelection('actor',id,previous);}
  async function preview(pinned=true){
   interruptGestures();
   const q=choice(),same=windowState?.type==='preview'&&windowState.id===selected;
   if(same){if(pinned&&windowState.pinned)close();else if(pinned){windowState.pinned=true;windowContent();}return;}
   if(!q||busy()||(!pinned&&windowState?.pinned))return;
   previewChoice=JSON.parse(JSON.stringify(q));windowState={type:'preview',id:selected,pinned};windowContent();layout();
   await requestForecast(true);
  }
  async function perform(){const q=choice();if(!q||busy())return;close();const r=await session.play(q);if(r.ok){selected=null;previewChoice=null;}if(!dead)redraw();}
  root.addEventListener('click',async e=>{
   if(e.detail>0&&Date.now()<suppressUntil){e.preventDefault();e.stopPropagation();return;}
   interruptGestures();
   const c=e.target.closest('[data-x-card]');if(c){await select(c.dataset.xCard);return;}
   const a=e.target.closest('[data-x-actor]');if(a){selectActor(a.dataset.xActor);return;}
   const f=e.target.closest('[data-x-field]');if(f){open('field',f.dataset.xField);return;}
   const o=e.target.closest('[data-x-order]');if(o){open('order',o.dataset.xOrder);return;}
   const scroll=e.target.closest('[data-x-scroll]');if(scroll){const row=$('#'+scroll.closest('[data-track]').dataset.track);row.scrollLeft+=Number(scroll.dataset.xScroll)*row.clientWidth*.8;layout();return;}
   const b=e.target.closest('[data-x]');if(!b){if(windowState&&!e.target.closest('.cw-drawer'))close();return;}if(b.disabled)return;
   const k=b.dataset.x;if(onCommon&&['records','menu','texts'].includes(k)){e.stopPropagation();close();onCommon(k,b);return;}if(k==='close'||k==='window-back'){backWindow();return;}if(k==='parent-close'){close();return;}if(k==='pin'||k==='parent-pin'){const w=k==='parent-pin'?windowParent:windowState;w.pinned=!w.pinned;windowContent();layout();return;}
   if(k==='actor-record'){e.stopPropagation();const key=b.dataset.key;close();onCommon?.('records',b,key);return;}if(k==='deck-detail'){open('card',b.dataset.id,true,b.closest('.cw-drawer'));return;}
   if(k==='preview'){await preview();return;}if(k==='use'){await perform();return;}if(k==='scene'){onScene?.();return;}if(k==='withdraw'){onWithdraw?.();return;}open(k,null,true,b.closest('.cw-drawer'));
  },{signal:events.signal});
  root.addEventListener('change',e=>{interruptGestures();const k=e.target.dataset.xSetting;if(k)settings[k]=e.target.checked;if(e.target.hasAttribute('data-x-hold'))settings.hold=Number(e.target.value);root.dataset.cardDrag=String(settings.drag);layout();},{signal:events.signal});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){interruptGestures();close();}},{signal:events.signal});
  root.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;clearTimeout(leaveTimer);const b=e.target.closest('.cw-menu [data-x],#cw-use');if(!b||b.disabled||b.contains(e.relatedTarget)||(windowState?.pinned&&b.id!=='cw-use'))return;clearTimeout(hoverTimer);hoverTimer=later(()=>{if(b.id==='cw-use')preview(false);else if(!['scene','records','menu'].includes(b.dataset.x))open(b.dataset.x,null,false);},180);},{signal:events.signal});
  root.addEventListener('pointerout',e=>{if(e.target.contains(e.relatedTarget))return;clearTimeout(hoverTimer);if(!e.relatedTarget?.closest?.('#cw-drawer'))leaveTimer=later(()=>{if(windowState&&!windowState.pinned)close();},160);},{signal:events.signal});
  function cancelDrag(suppress=true,repaint=true){if(drag)holdCue.cancel();if(autoScrollFrame!==null){cancelAnimationFrame(autoScrollFrame);autoScrollFrame=null;}const d=drag;if(!d)return;drag=null;clearTimeout(d.timer);
   // Clear ownership before release, which may synchronously emit lost capture.
   if(root.hasPointerCapture?.(d.pointer))root.releasePointerCapture(d.pointer);
   $('#cw-drag-ghost').hidden=true;$('#cw-drop-zone').dataset.drag='false';if(suppress)suppressUntil=Date.now()+500;
   if(repaint&&d.held&&!dead)redraw();
  }
  // Only distinguish a click from motion/cancellation; actors have no hold timer.
  function cancelActorPress(suppress=false){if(!actorPress)return;actorPress=null;if(suppress)suppressUntil=Date.now()+500;}
  function cancelPan(){const p=pan;pan=null;if(p?.moved){suppressUntil=Date.now()+500;if(root.hasPointerCapture?.(p.pointer))root.releasePointerCapture(p.pointer);}}
  function interruptGestures(){gestureEpoch++;cancelPan();clearTimeout(hoverTimer);clearTimeout(leaveTimer);cancelActorPress(true);cancelDrag();}
  function positionHeldCard(point){
   const r=api.uiSpace(root),g=$('#cw-drag-ghost'),width=drag?.width||248,height=drag?.height||208;
   g.style.left=Math.max(0,Math.min(r.width-width,(point.clientX-r.left)/r.scale-(drag?.offsetX??width/2)))+'px';
   g.style.top=Math.max(0,Math.min(r.height-height,(point.clientY-r.top)/r.scale-(drag?.offsetY??height/2)))+'px';
  }
  function scrollWhileHeld(){
   autoScrollFrame=null;if(!drag?.held||dead)return;
   for(const row of [$('#cw-field'),$('#cw-hand')]){
    const r=row.getBoundingClientRect(),edge=64*api.displayScale(root),x=drag.lastX,y=drag.lastY;
    if(y<r.top||y>r.bottom||x<r.left||x>r.right||row.scrollWidth<=row.clientWidth)continue;
    const step=x<r.left+edge?-16:x>r.right-edge?16:0;
    if(step){row.scrollLeft=Math.max(0,Math.min(row.scrollWidth-row.clientWidth,row.scrollLeft+step));layout();}
   }
   autoScrollFrame=requestAnimationFrame(scrollWhileHeld);
  }
  root.addEventListener('pointerdown',e=>{if(e.isPrimary===false){interruptGestures();return;}if(e.button!==0||busy()||drag||actorPress||pan)return;
   gestureEpoch++;suppressUntil=0;
   const a=e.target.closest('[data-x-actor]');if(a){actorPress={pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false};return;}
   const c=e.target.closest('[data-x-card]');
   if(!c){const row=e.target.closest('.cw-scroll');if(row&&!e.target.closest('button'))pan={row,pointer:e.pointerId,x:e.clientX,scroll:row.scrollLeft,moved:false};return;}
   if(!settings.drag)return;
   const rect=(c.closest('.cw-hand-card')||c).getBoundingClientRect(),scale=api.displayScale(root);
   drag={id:c.dataset.xCard,pointer:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,initialScroll:$('#cw-hand').scrollLeft,width:rect.width/scale,height:rect.height/scale,offsetX:(e.clientX-rect.left)/scale,offsetY:(e.clientY-rect.top)/scale,face:c.innerHTML,scroll:false,held:false,token:state.view.meta.view_token};
   const current=drag;current.timer=later(()=>{
    if(drag!==current||drag.scroll||dead||busy()||!settings.drag||current.token!==state.view.meta.view_token)return;
    holdCue.cancel();drag.held=true;selected=drag.id;previewChoice=null;retainTarget();close();redraw();
    const ghost=$('#cw-drag-ghost');ghost.innerHTML=drag.face;Object.assign(ghost.style,{width:drag.width+'px',height:drag.height+'px'});ghost.hidden=false;$('#cw-drop-zone').dataset.drag='true';
    positionHeldCard({clientX:drag.lastX,clientY:drag.lastY});root.setPointerCapture?.(e.pointerId);autoScrollFrame=requestAnimationFrame(scrollWhileHeld);
   },settings.hold);holdCue.start(e,settings.hold,'drag',handActionLabel(current.id));
  },{signal:events.signal});
  root.addEventListener('pointermove',e=>{holdCue.move(e);if(pan?.pointer===e.pointerId){const dx=e.clientX-pan.x;if(pan.moved||Math.abs(dx)>8){if(!pan.moved){pan.moved=true;root.setPointerCapture?.(e.pointerId);}pan.row.scrollLeft=pan.scroll-dx/api.displayScale(root);e.preventDefault();layout();}return;}if(actorPress?.pointer===e.pointerId&&Math.hypot(e.clientX-actorPress.x,e.clientY-actorPress.y)>8)actorPress.moved=true;
   if(!drag||drag.pointer!==e.pointerId)return;drag.lastX=e.clientX;drag.lastY=e.clientY;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(!drag.held&&(drag.scroll||Math.hypot(dx,dy)>8)){clearTimeout(drag.timer);holdCue.cancel();drag.scroll=true;$('#cw-hand').scrollLeft=drag.initialScroll-dx/api.displayScale(root);e.preventDefault();layout();return;}
   if(drag.held){e.preventDefault();positionHeldCard(e);}
  },{signal:events.signal,passive:false});
  root.addEventListener('pointerup',async e=>{if(pan?.pointer===e.pointerId){cancelPan();return;}if(actorPress?.pointer===e.pointerId){if(actorPress.moved)suppressUntil=Date.now()+500;cancelActorPress();return;}
   const d=drag;if(!d||d.pointer!==e.pointerId)return;const hit=document.elementFromPoint?.(e.clientX,e.clientY);cancelDrag(false,false);if(!d.held&&!d.scroll)return;suppressUntil=Date.now()+500;if(!d.held||d.token!==state.view.meta.view_token)return;redraw();
   if(!hit||!$('#cw-drop-zone').contains(hit))return;
   const q=choice();if(!q)return;
   const key=forecastKey(),epoch=gestureEpoch,p=await requestForecast();if(!p||dead||forecastKey()!==key||gestureEpoch!==epoch)return;
   previewChoice=JSON.parse(JSON.stringify(q));const loses=(p.unused_hand_expiry||[]).some(a=>a.expires&&a.destination==='destroyed');
   if(settings.quick&&p?.mode==='place'&&!loses)await perform();else{windowState={type:'preview',id:selected,pinned:true};windowContent();layout();}
  },{signal:events.signal});
  for(const type of ['pointercancel','lostpointercapture'])root.addEventListener(type,e=>{if(drag?.pointer===e.pointerId||actorPress?.pointer===e.pointerId||pan?.pointer===e.pointerId)interruptGestures();},{signal:events.signal});
  root.addEventListener('pointerleave',()=>{cancelActorPress(true);if(drag&&!drag.held)interruptGestures();},{signal:events.signal});
  root.addEventListener('contextmenu',e=>{if(drag||actorPress)e.preventDefault();},{signal:events.signal});
  root.addEventListener('scroll',e=>{if(e.target.id==='cw-actors')cancelActorPress(true);if(e.target.id==='cw-hand'&&drag&&!drag.held&&!drag.scroll&&Math.abs(e.target.scrollLeft-drag.initialScroll)>1)interruptGestures();layout();},{capture:true,signal:events.signal});
  $('#cw-hand').addEventListener('wheel',interruptGestures,{passive:true,signal:events.signal});
  window.addEventListener('blur',interruptGestures,{signal:events.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)interruptGestures();},{signal:events.signal});
  document.addEventListener('pointerdown',e=>{if((drag||actorPress||pan)&&e.isPrimary===false)interruptGestures();},{capture:true,signal:events.signal});
  document.addEventListener('pointerup',e=>{if(!root.contains(e.target)&&(drag?.pointer===e.pointerId||actorPress?.pointer===e.pointerId||pan?.pointer===e.pointerId))interruptGestures();},{signal:events.signal});
  const observer=new ResizeObserver(()=>{interruptGestures();layout();});observer.observe(root);
  (root.closest('[data-display]')||root).addEventListener('cw-display-change',()=>{interruptGestures();layout();},{signal:events.signal});
  function update(d,s=session.state()){data=d;state=s;if(!x())return;api.applySceneArtwork?.($('#cw-scene-base'),data);
   updateEvents();
   const token=s.view.meta.view_token;if(previousToken&&token!==previousToken){gestureEpoch++;cancelDrag(true,false);cancelActorPress(true);selected=null;previewChoice=null;forecast=null;close();}previousToken=token;
   retainTarget();
   if(selected&&!hand().some(c=>c.id===selected)){selected=null;close();}redraw();
   if(!selected&&!state.reservations&&!state.pending&&!state.error&&reservationToken!==token&&session.can('previewAction')){reservationToken=token;queueMicrotask(()=>{if(!dead&&!selected&&!state.pending)session.reservations();});}
  }
  update(data,state);
  document.fonts?.ready.then(()=>{if(!dead)layout();});
  return {update,openPanel(kind){if(['objective','status','order','deck','history','settings'].includes(kind))open(kind,null,false);},dispose(){dead=true;holdCue.dispose();cancelPan();cancelDrag();cancelActorPress();observer.disconnect();events.abort();for(const t of timers)clearTimeout(t);root.replaceChildren();root.classList.remove('cw-explore');}};
 };
})(globalThis.CrossweaveUI);

/* Public-view routing and Campaign lifecycle. No import of a guessed runtime path. */
(function(api){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const texts=d=>Array.isArray(d.texts)?d.texts:Object.values(d.texts||{});
 const reason=e=>({save_not_found:'保存がありません。新しく始める場合は「はじめから」を選んでください',save_already_exists:'保存があります。「続きから」を選んでください',slot_not_empty:'保存があります。上書きはしません',unsupported_save_schema:'対応していない保存形式です。元ファイルは変更していません',invalid_save_json:'保存JSONを読めません。入力は保持しています',storage_write_failed:'保存できませんでした。元の状態と入力を保持しています',storage_unavailable:'保存先を利用できません',indexeddb_unavailable:'この表示環境では永続保存を利用できません',storage_open_failed:'保存先を開けませんでした',storage_open_blocked:'保存先が別の画面で使用されています',storage_read_failed:'保存内容を読み出せませんでした',feature_not_connected:'この操作は現在の接続版では未対応です',controller_result_not_connected:'本体の戻り値との接続が必要です',connection_failed:'応答を確認できませんでした',unsaved_draft:'先に下書きを保存してください',busy:'処理が終わるまでお待ちください'})[e?.code]||'保存内容を確認できません。元のデータは変更していません';
 const makeId=x=>typeof x==='string'?x:x?.id;
 api.mountApplication=function(root,{Campaign=null,config=null,controller=null,explorationRenderer=null}={}){
  let session=null,child=null,unsubscribe=null,kind=null,dead=false,changing=false,menu=false,sceneRequested=false;
  let sceneKey=null,openText=null,seen=new Set(),toRecord=new Set(),recording=false,observer=null,selected=null;
  let rawImport='',startupError='',lastSceneToken=null;
  const events=new AbortController(),launcher=Campaign&&config?api.makeLauncher(Campaign,config):null;
  root.classList.add('cw-app');root.innerHTML='<div class="cw-appbar"><span>crossweave</span><div><button type="button" data-global="scene">本文</button><button type="button" data-global="menu">保存</button></div></div><div class="cw-app-message" role="status" aria-live="polite" data-message></div><section data-start></section><section data-save hidden></section><div data-stage></div>';
  const $=s=>root.querySelector(s),message=s=>{$('[data-message]').textContent=s;};
  function start(){
   $('[data-start]').hidden=!!session;
   $('[data-start]').innerHTML=`<div class="cw-start"><h1>crossweave</h1><p>${launcher?'継続データ':'本体APIの接続待ち'}</p><div class="cw-actions"><button type="button" data-global="open" ${!launcher?'disabled':''}>続きから</button><button type="button" data-global="create" ${!launcher?'disabled':''}>はじめから</button><button type="button" data-global="menu">保存を読み込む</button></div></div>`;
   saveMenu();
  }
  function saveMenu(){const box=$('[data-save]');box.hidden=!menu;if(!menu)return;
   if(!box.firstChild)box.innerHTML='<div class="cw-save"><h2>保存データ</h2><div class="cw-actions"><button type="button" data-global="export">書き出す</button><button type="button" data-global="menu">閉じる</button></div><label>読み込むJSONファイル<input type="file" accept=".json,application/json" data-import-file></label><label>保存JSON<textarea data-import-document rows="5" spellcheck="false"></textarea></label><button type="button" data-global="import">空の保存先へ読み込む</button><p data-import-error role="alert"></p></div>';
   $('[data-import-document]').value=rawImport;
   const importing=!!launcher?.state().pending||!!launcher?.state().canRetry||!!session;
   $('[data-import-document]').disabled=importing; $('[data-import-file]').disabled=importing;
   $('[data-global="export"]').disabled=!session||!!session.state().pending||session.state().canRetry;
   $('[data-global="import"]').disabled=!launcher||!!session||!!launcher?.state().pending;
  }
  function controls(s){
   const busy=changing||!!s?.pending;
   $('[data-global="scene"]').disabled=busy||!s?.view?.display_data?.scene;
   root.querySelectorAll('[data-scene-action],[data-play],[data-preview]').forEach(b=>{b.disabled=busy||s?.canRetry||s?.stale;});
   const d=s?.view?.display_data;
   if(d)root.querySelectorAll('[data-scene-action="continue"]').forEach(b=>b.disabled=b.disabled||!d.scene?.can_continue||!session.can('continue_scene')||!seen.size);
   if(d)root.querySelectorAll('[data-scene-action="withdraw"]').forEach(b=>b.disabled=b.disabled||!d.scene?.can_withdraw||!session.can('withdraw'));
   if(d)root.querySelectorAll('[data-play]').forEach(b=>b.disabled=b.disabled||!session.can('play'));
   if(menu)saveMenu();
  }
  async function connect(c){
   if(changing||dead)return;changing=true;message('読み込み中…');
   const next=api.makeSession(c,{reopen:Campaign&&config?()=>Campaign.open({slot_id:config.slot_id}):null}),r=await next.refresh({preserveLocal:false});
   changing=false;if(dead){next.dispose();return;}
   if(!r.ok){next.dispose();startupError=reason(r.error);message(startupError);return;}
   child?.dispose();child=null;unsubscribe?.();session?.dispose();session=next;kind=null;sceneRequested=false;
   $('[data-start]').hidden=true;message('');unsubscribe=session.subscribe(render);menu=false;saveMenu();
  }
  function stopChild(){child?.dispose();child=null;observer?.disconnect();observer=null;lastSceneToken=null;}
  function render(s){if(dead||!s.view)return;const d=s.view.display_data;
   const next=d.scene&&(d.scene.paused||sceneRequested)?'scene':d.phase==='exploring'?'exploration':'preparation';
   if(next!==kind){stopChild();kind=next;selected=null;$('[data-stage]').replaceChildren();
    if(next==='preparation')child=api.mountPreparation($('[data-stage]'),session);
    if(next==='exploration'&&(explorationRenderer||api.mountExploration))child=(explorationRenderer||api.mountExploration)($('[data-stage]'),{session,display_data:d,onScene:()=>{sceneRequested=true;render(session.state());},onWithdraw:async()=>{if(scopeConfirm())await session.execute('withdraw');}});
   }
   if(next==='scene')renderScene(s);
   if(next==='exploration'){if(child?.update)child.update(d,s);else if(!child)$('[data-stage]').textContent='探索画面の接続部品を読み込めませんでした';}
   controls(s);
   if(next!=='preparation'){
    message(s.error?reason(s.error):s.pending?.kind==='write'?'保存中…':s.pending?'読み込み中…':'');
    const errorBox=root.querySelector('[data-recovery]');errorBox?.remove();
    if(s.error){const node=document.createElement('div');node.dataset.recovery='';node.innerHTML=`${s.canRetry?'<button type="button" data-global="retry">再試行</button>':''}<button type="button" data-global="refresh">最新を読む</button>`;$('[data-message]').append(node);}
   }
   if(next==='scene'&&!s.pending&&!s.error)queueMicrotask(flushDisplayed);
  }
  function renderScene(s){const d=s.view.display_data,key=d.phase+'|'+d.scene.id+'|'+(d.case?.attempts??'');
   if(key!==sceneKey){sceneKey=key;openText=null;seen=new Set();toRecord=new Set();lastSceneToken=null;}
   if(lastSceneToken===s.view.meta.view_token&&$('[data-stage]').firstChild)return;
   lastSceneToken=s.view.meta.view_token;observer?.disconnect();
   const available=texts(d),ids=new Set([...(d.scene.text_ids||[]),...(d.scene.optional_text_ids||[])]),current=available.filter(t=>ids.has(t.id));
   const text=current.find(t=>t.id===openText);
   const labels=new Map();let mainNumber=0,detailNumber=0;
   for(const t of current)labels.set(t.id,t.title||(t.kind==='detail'?'詳しく '+(++detailNumber):'本文 '+(++mainNumber)));
   const body=text?[...new Set([text.short_text,text.detail_text].filter(Boolean))]:[];
   $('[data-stage]').innerHTML=`<div class="cw-scene"><h2>本文</h2><nav>${current.map(t=>`<button type="button" data-text-id="${esc(t.id)}" aria-pressed="${t.id===openText}">${esc(labels.get(t.id))}</button>`).join('')}</nav><div class="cw-scene-body">${text?`<article><h3>${esc(labels.get(text.id))}</h3>${body.map(p=>`<p data-displayed-text="${esc(text.id)}">${esc(p)}</p>`).join('')}</article>`:'<p>読む本文を選んでください</p>'}</div><div class="cw-actions"><button type="button" data-scene-action="back" ${d.scene.paused?'hidden':''}>戻る</button><button type="button" data-scene-action="continue" ${!d.scene.paused?'hidden':''}>進む</button><button type="button" data-scene-action="withdraw" ${!d.scene.can_withdraw?'hidden':''}>撤退</button></div></div>`;
   const article=root.querySelector('[data-displayed-text]');
   if(article&&(text.short_text||text.detail_text)){
    observer=new IntersectionObserver(entries=>{for(const en of entries){if(!document.hidden&&en.isIntersecting&&en.intersectionRatio>0){toRecord.add(en.target.dataset.displayedText);flushDisplayed();}}},{root:null,threshold:0.01});observer.observe(article);
   }
  }
  async function flushDisplayed(){
   if(recording||!session||kind!=='scene'||dead)return;const s=session.state(),d=s.view?.display_data;
   if(s.pending||s.error||s.localDirty||!(session.can('record_displayed_text')||session.can('continue_scene')))return;
   const ids=[...toRecord].filter(id=>!seen.has(id));if(!ids.length)return;
   const key=sceneKey,scene_id=d.scene.id;recording=true;
   const r=await session.recordDisplayed(scene_id,ids);recording=false;
   if(dead||key!==sceneKey)return;
   if(r.ok){ids.forEach(id=>{seen.add(id);toRecord.delete(id);});controls(session.state());queueMicrotask(flushDisplayed);}
  }
  root.addEventListener('click',async e=>{
   const text=e.target.closest('[data-text-id]');if(text){openText=text.dataset.textId;lastSceneToken=null;render(session.state());return;}
   const scene=e.target.closest('[data-scene-action]');if(scene&&!scene.disabled){const s=session.state(),d=s.view.display_data;
    if(scene.dataset.sceneAction==='back'){sceneRequested=false;if(!d.scene.paused){kind=null;render(s);}return;}
    if(scene.dataset.sceneAction==='continue'){sceneRequested=false;await session.execute('continue_scene',{scene_id:d.scene.id,advance:true,displayed_text_ids:[...seen]});}
    if(scene.dataset.sceneAction==='withdraw'&&scopeConfirm())await session.execute('withdraw');return;
   }
   const b=e.target.closest('[data-global]');if(!b||b.disabled)return;const a=b.dataset.global;
   try{
    if(a==='menu'){menu=!menu;saveMenu();return;}
    if(a==='scene'){if(!session?.state().view.display_data.scene)return;if(session.state().localDirty){message(reason({code:'unsaved_draft'}));return;}sceneRequested=true;render(session.state());return;}
    if(a==='retry'){await session?.retry();return;}if(a==='refresh'){await session?.refresh();return;}
    if(a==='close-detail'){selected=null;render(session.state());return;}
    if(a==='withdraw'){if(session.can('withdraw')&&scopeConfirm())await session.execute('withdraw');return;}
    if(a==='export'){const raw=await session.exportSave(),data=typeof raw==='string'?raw:JSON.stringify(raw,null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='crossweave-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('書き出しデータを作成しました');return;}
    if(!launcher)return;
    let r;if(a==='retry-start')r=await launcher.retry();if(a==='open')r=await launcher.open();if(a==='create')r=await launcher.create();if(a==='import'){rawImport=$('[data-import-document]').value;r=await launcher.importSave(rawImport);}
    if(r?.ok)await connect(r.controller);else if(r){message(reason(r.error));if(menu)$('[data-import-error]').textContent=reason(r.error);if(launcher.state().canRetry){const retry=document.createElement('button');retry.type='button';retry.dataset.global='retry-start';retry.textContent='同じ要求を再試行';$('[data-message]').append(retry);}}
   }catch(err){message(reason(err));}
  },{signal:events.signal});
  function scopeConfirm(){return globalThis.confirm('今回の探索から撤退しますか？');}
  root.addEventListener('input',e=>{if(e.target.matches('[data-import-document]'))rawImport=e.target.value;},{signal:events.signal});
  root.addEventListener('change',async e=>{if(e.target.matches('[data-import-file]')){const f=e.target.files?.[0];if(!f)return;try{rawImport=await f.text();if(!dead)saveMenu();}catch{message('ファイルを読めません。元ファイルは変更していません');}}},{signal:events.signal});
  const offLauncher=launcher?.subscribe(s=>{root.querySelectorAll('[data-global="open"],[data-global="create"],[data-global="import"]').forEach(b=>b.disabled=s.pending||s.canRetry||!!session||(s.active&&b.dataset.global!=='open'));});
  start();if(controller)connect(controller);
  return {get session(){return session;},dispose(){dead=true;stopChild();unsubscribe?.();session?.dispose();launcher?.dispose();offLauncher?.();events.abort();root.replaceChildren();}};
 };})(globalThis.CrossweaveUI);

/* Display geometry only. One 1920x1080 game coordinate system at every scale. */
(function(api){'use strict';
 const frames=new WeakMap();
 api.displaySize=Object.freeze({width:1920,height:1080});
 api.mountDisplayFrame=function(root){
  let frame=frames.get(root);
  if(!frame){
   const doc=root.ownerDocument,viewport=doc.createElement('div'),space=doc.createElement('div');
   const originalStyle=root.getAttribute('style'),originalDisplay=root.dataset.display;
   viewport.className='cw-display-viewport';viewport.setAttribute('role','region');viewport.setAttribute('aria-label','ゲーム画面');
   space.className='cw-display-space';root.before(viewport);viewport.append(space);space.append(root);
   Object.assign(viewport.style,{width:'100%',minWidth:'0',position:'relative',overflow:'hidden'});
   Object.assign(space.style,{position:'relative',marginInline:'auto'});
   Object.assign(root.style,{width:'1920px',height:'1080px',maxWidth:'none',position:'absolute',left:'0',top:'0',transformOrigin:'0 0'});
   root.dataset.display='fhd';
   frame={count:0,mode:'fit',scale:1,viewport,space};
   frame.sync=function(){
    const width=viewport.clientWidth||viewport.getBoundingClientRect().width||1024;
    const scale=frame.mode==='actual'?1:Math.min(1,width/1920),changed=scale!==frame.scale;
    frame.scale=scale;root.dataset.displayScale=String(scale);
    root.style.transform='scale('+scale+')';
    space.style.width=1920*scale+'px';space.style.height=1080*scale+'px';
    viewport.style.height=Math.min(1080,width*9/16)+'px';viewport.style.overflow=frame.mode==='actual'?'auto':'hidden';
    if(frame.mode==='fit'){viewport.scrollLeft=0;viewport.scrollTop=0;}
    if(changed)root.dispatchEvent(new CustomEvent('cw-display-change',{detail:{mode:frame.mode,scale}}));
    root.dispatchEvent(new CustomEvent('cw-display-state',{bubbles:true,detail:{mode:frame.mode,scale}}));
   };
   frame.observer=new ResizeObserver(frame.sync);frame.observer.observe(viewport);frames.set(root,frame);frame.sync();
   frame.destroy=function(){frame.observer.disconnect();viewport.before(root);viewport.remove();if(originalStyle===null)root.removeAttribute('style');else root.setAttribute('style',originalStyle);if(originalDisplay===undefined)delete root.dataset.display;else root.dataset.display=originalDisplay;delete root.dataset.displayScale;frames.delete(root);};
  }
  frame.count++;let disposed=false;
  return {sync:frame.sync,dispose(){if(disposed)return;disposed=true;if(--frame.count===0)frame.destroy();}};
 };
 api.setDisplayMode=function(root,mode){const frame=frames.get(root);if(!frame||!['fit','actual'].includes(mode))return false;frame.mode=mode;frame.sync();return true;};
 api.displayState=root=>{const f=frames.get(root);return f?{mode:f.mode,scale:f.scale,width:1920,height:1080}:null;};
})(globalThis.CrossweaveUI);

/* UI geometry only. The header/footer each reserve a 44px action row. */
(function(api){'use strict';
api.journeyLayout=function(width,total,anchor=0,reserved=0){
 const compact=width<=400,padding=compact?0:8,gap=compact?4:8;
 const height=width*9/16,availableHeight=height-(width>=1920?130:90)-padding*2-reserved,availableWidth=width-2-padding*2;
 const columns=Math.max(1,Math.min(4,Math.floor((availableWidth+gap)/(224+gap))));
 const tileHeight=104;
 const maxRows=Math.max(1,Math.floor((availableHeight+gap)/(tileHeight+gap)));
 const capacity=columns*maxRows,pages=Math.max(1,Math.ceil(total/capacity));
 const page=Math.min(pages-1,Math.floor(Math.max(0,anchor)/capacity)),start=page*capacity,end=Math.min(total,start+capacity);
 const rows=Math.max(1,Math.ceil((end-start)/columns));
 const rowHeight=Math.min(tileHeight,(availableHeight-gap*(rows-1))/rows);
 return {width,height,padding,gap,columns,rows,capacity,pages,page,start,end,rowHeight,availableHeight,availableWidth};
};
})(globalThis.CrossweaveUI);

/* One Campaign lifecycle for the accepted UI. Storage is owned by the injected provider. */
(function(api){'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 api.saveFailureText=e=>({save_not_found:'保存がありません。「はじめから」で開始できます。',save_already_exists:'保存があります。「続きから」を選んでください。',slot_not_empty:'保存があります。既存の保存は変更していません。「続きから」を選んでください。',invalid_save_json:'保存ファイルを読めません。選んだファイルは保持しています。',unsupported_save_schema:'対応していない保存形式です。元のファイルは変更していません。',storage_write_failed:'保存できませんでした。変更案を残しています。',storage_unavailable:'保存先を利用できません。',indexeddb_unavailable:'この表示環境では保存先を利用できません。',storage_open_failed:'保存先を開けませんでした。',storage_open_blocked:'別の画面が保存先を使用しています。',storage_read_failed:'保存内容を読み出せませんでした。',connection_failed:'応答を確認できませんでした。',secure_request_id_unavailable:'この表示環境では開始できません。',invalid_response:'本体の応答を確認できませんでした。'})[e?.code]||null;
 api.downloadSave=function(document){
  if(typeof URL.createObjectURL!=='function')throw {code:'download_unavailable'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(document,null,2)],{type:'application/json'})),link=globalThis.document.createElement('a');
  link.href=url;link.download='crossweave-save.json';link.hidden=true;globalThis.document.body.append(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 };
 api.mountJourneyApplication=function(root,{Campaign,config,title='夜潮の排水路',storageMode='persistent'}={}){
  const launcher=api.makeLauncher(Campaign,config),events=new AbortController(),displayFrame=api.mountDisplayFrame(root);
  let child=null,connecting=false,reading=false,dead=false,importing=false,raw='',filename='',error='',message='';
  const busy=()=>connecting||reading||launcher.state().pending;
  const explain=e=>api.saveFailureText(e)||'開始できませんでした。保存と入力は保持しています。';
  const button=(label,action,disabled=false)=>'<button type="button" data-launch="'+action+'" class="cj-button cursor-interaction" '+(disabled?'disabled':'')+'>'+label+'</button>';
  const resize=()=>{if(child||dead)return;const shell=root.querySelector('.cj-shell');if(shell)shell.style.height=api.displaySize.height+'px';};
  const observer=new ResizeObserver(resize);observer.observe(root);
  function render(){if(dead||child)return;const s=launcher.state(),locked=busy()||s.canRetry;
   root.dataset.screen='start';root.dataset.storageMode=storageMode;
   const content=importing?'<label class="cj-import-file">保存ファイル<input type="file" accept=".json,application/json" data-launch-file '+(locked?'disabled':'')+'></label><p class="cj-import-name">'+escape(filename)+'</p>':'<h2>crossweave</h2>';
   const actions=importing?button('読み込む','import',locked||s.active||!raw):button('続きから','open',locked)+button('はじめから','create',locked||s.active)+button('読み込む','import-menu',locked||s.active);
   root.innerHTML='<div class="cj-shell cj-launch-shell"><header class="cj-header">'+(importing?button('戻る','back',locked):'')+'<span class="cj-screen-title">'+(importing?'保存を読み込む':'crossweave')+'</span></header><main class="cj-layout cj-launch-main">'+content+'<div class="cj-launch-notice" role="'+(error?'alert':'status')+'">'+escape(error||(busy()?'読み込み中…':message))+'</div></main><footer class="cj-fixed-footer">'+(s.canRetry?button('もう一度','retry',busy()):actions)+'</footer></div>';
   root.setAttribute('aria-busy',String(busy()));resize();
   root.querySelector('[data-launch="back"]')?.setAttribute('aria-label','開始画面に戻る');
  }
  async function connect(controller){
   if(dead||connecting)return;connecting=true;error='';render();
   const session=api.makeSession(controller,{reopen:()=>Campaign.open({slot_id:config.slot_id})});
   const result=await session.refresh({preserveLocal:false});connecting=false;
   if(dead){session.dispose();return;}
   if(!result.ok){session.dispose();error=explain(result.error);render();return;}
   observer.disconnect();root.replaceChildren();
   child=api.mountJourney(root,{controller,Campaign,slot_id:config.slot_id,title,session,storageMode});
  }
  root.addEventListener('click',async event=>{
   const b=event.target.closest('[data-launch]');if(!b||b.disabled||busy()||child)return;
   const action=b.dataset.launch;
   if(action==='import-menu'||action==='back'){importing=action==='import-menu';error='';render();return;}
   error='';message='';
   try{let result;
    if(action==='open')result=await launcher.open();
    if(action==='create')result=await launcher.create();
    if(action==='import')result=await launcher.importSave(raw);
    if(action==='retry')result=await launcher.retry();
    if(dead)return;if(result?.ok)await connect(result.controller);else if(result){error=explain(result.error);render();}
   }catch(e){if(!dead){error=explain(e);render();}}
  },{signal:events.signal});
  root.addEventListener('change',async event=>{
   if(!event.target.matches('[data-launch-file]')||busy()||child)return;
   const file=event.target.files?.[0];if(!file)return;reading=true;error='';render();
   try{const text=await file.text();if(!dead){raw=text;filename=file.name;}}
   catch{if(!dead)error='ファイルを読めませんでした。前の入力を保持しています。';}
   finally{reading=false;render();}
  },{signal:events.signal});
  const off=launcher.subscribe(render);render();
  return {get journey(){return child;},get session(){return child?.session||null;},state:()=>({launcher:launcher.state(),connecting,reading,filename,importing,storageMode}),dispose(){dead=true;off();observer.disconnect();events.abort();launcher.dispose();child?.dispose();root.replaceChildren();displayFrame.dispose();}};
 };
})(globalThis.CrossweaveUI);

/* UI-PLAN-001 journey prototype. All game state and prices come from CW-M1-view-1. */
(function(api){'use strict';
api.mountJourney=function(root,{controller,Campaign,slot_id,title,session:providedSession=null,storageMode='ephemeral',destinationPreview=null,acquisitionPreview=null}){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=x=>x==null?x:JSON.parse(JSON.stringify(x)),pt=n=>Number.isInteger(n)?String(n/100):'—';
 const session=providedSession||api.makeSession(controller,{reopen:()=>Campaign.open({slot_id})});
 const $=s=>root.querySelector(s),list=x=>Array.isArray(x)?x:Object.values(x||{});
 const icon=n=>'<i data-lucide="'+n+'" aria-hidden="true"></i>';
 const button=(label,action,extra='',kind='')=>'<button type="button" data-j="'+action+'" '+extra+' class="cj-button cursor-interaction '+kind+'">'+label+'</button>';
 let state=session.state(),tab='deck',place=state.view?.display_data.draft?.dirty?'collection':'hub',panel=null,windows=[],child=null,lastScreen=null;
 let message='',continuation=null,running=false,suspended=false,disposed=false,sceneRequested=false;
 let observer=null,recording=false,sceneKey='',seen=new Set(),visible=new Set(),committedFlash=false;
 let recordTab='targets',recordTarget=null,detailFromRecords=false,recordDetail=null,windowAnchor=null,panelTrail=[],recordParentRect=null;
 const recordEntries=new Map(),scrollMemory=new Map();
 let lastContext=null,lastPhase=null;
 let collection=null,collectionNode=null,collectionState=null;
 let skillFilter='all',menuPage=0;
 let purchaseChoice=null,conversionIds=new Set(),viewToken=null;
 const selected={deck:null,skills:null},pageAnchors={deck:0,skills:0,offers:0,owned:0},events=new AbortController();
 const displayFrame=api.mountDisplayFrame(root);
 const frameWidth=api.displaySize.width;
 root.dataset.storageMode=storageMode;
 root.innerHTML='<div class="cj-shell"><header class="cj-header" data-header></header><div class="cj-status" data-status role="status" aria-live="polite"></div><div class="cj-layout"><main data-main></main><aside data-inspector hidden></aside></div><div data-bottom></div></div>';
 // Game coordinates remain fixed; the outer display owns fitting and scrolling.
 $('.cj-shell').style.height=api.displaySize.height+'px';
 const frameObserver=new ResizeObserver(()=>queueMicrotask(layoutWindows));
 frameObserver.observe(root);
 root.addEventListener('cw-display-change',()=>queueMicrotask(layoutWindows),{signal:events.signal});
 const d=()=>state.view?.display_data,h=()=>d()?.home,p=()=>state.draft,info=id=>d()?.details?.[id]||state.draftDetails?.[id]||(id==='$purchase'?d()?.details?.[p()?.candidate]:null)||{};
 const name=id=>info(id).name||'詳細未提供';
 const connectedAcquisition=()=>d()?.public_contract==='CW-M1-public-0.6'&&!acquisitionPreview;
 const unifiedAcquisition=()=>!!acquisitionPreview||connectedAcquisition();
 const composition=plan=>{if(!plan)return null;const value=clone(plan);(value.composition||value.next_preparation).deck.sort();return value;};
 const dirty=()=>p()&&(connectedAcquisition()?(!!d().migration_notice?.review_required||!api.samePreparation(p(),api.currentPlan(state.view))):JSON.stringify(composition(p()))!==JSON.stringify(composition(api.currentPlan(state.view))));
 const busy=()=>running||!!state.pending||state.canRetry||state.stale;
 const canSuspend=()=>!suspended&&d()?.phase==='exploring';
 const learned=base=>p()?.retain_learning?.includes(base)||p()?.next_preparation?.learn.includes(base);
 const equipped=id=>(p()?.composition||p()?.next_preparation)?.equipment.includes(id);
 const count=(id,deck=(p()?.composition||p()?.next_preparation)?.deck||[])=>deck.filter(x=>x===id).length;
 const group=ids=>[...new Set(ids)].map(id=>({id,count:count(id,ids)}));
 const itemIcon=id=>info(id).kind==='passive'?'sparkles':({attack:'swords',guard:'shield',heal:'heart-pulse'})[info(id).primary?.kind]||'layers';
 function reason(e){const specific=economyFailure(e);if(specific)return specific;return api.saveFailureText?.(e)||({download_unavailable:'この表示環境ではファイルを書き出せません。保存内容は保持しています',deck_size:'札を12枚にしてください',invalid_deck_size:'札を12枚にしてください',deck_base_cap_exceeded:'同じ札は2枚までです',equipment_capacity_exceeded:'心得の装備枠が足りません',insufficient_learning_funds:'着想が足りません',storage_write_failed:'確定できませんでした。変更案は残っています',stale_revision:'別の操作で変わりました。最新の内容を読み直してください',feature_not_connected:'この機能は未対応です',comparison_required:'変更の確認が必要です',connection_failed:'応答を確認できませんでした'})[e?.code]||'操作を完了できませんでした';}
 function currentScreen(){const v=d();if(suspended)return 'start';if(v.phase==='return')return 'return';if(v.scene?.paused||sceneRequested)return 'scene';if(v.phase==='exploring')return 'explore';return unifiedAcquisition()&&place==='collection'?'collection':place==='hub'?'hub':tab;}
 function mountCollection(){
  if(!collectionNode){
   collectionNode=document.createElement('div');collectionNode.id='cw-acquisition-review';collectionNode.dataset.embedded='true';
   collectionNode.innerHTML='<section class="cp-shell" aria-label="札と心得の編成"><div data-screen class="cp-screen"></div><div data-overlay class="cp-overlay" hidden></div></section><p class="cp-live" role="status" aria-live="polite" data-live></p>';
   $('[data-main]').append(collectionNode);
   const fixture=clone(acquisitionPreview);if(fixture&&Number.isInteger(h()?.economy.unspent_units))fixture.initial.wallet=h().economy.unspent_units/100;
   collection=api.mountAcquisitionReview(collectionNode,fixture,{session:connectedAcquisition()?session:null,onBack(){collection.suspend();place='hub';resetWindows();render();},onChange(value){collectionState=value;root.dispatchEvent(new CustomEvent('cw-acquisition-state',{bubbles:true,detail:value}));}});
  }else if(!collectionNode.isConnected)$('[data-main]').append(collectionNode);
 }
 function mark(id){return '<span class="cj-mark" aria-hidden="true">'+icon(itemIcon(id))+'</span>';}
 function detailsButton(id,extra=''){return button(mark(id)+'<span>'+esc(name(id))+'</span>','detail','data-id="'+esc(id)+'" '+extra,'cj-object');}
 /* Optional review catalogue. Selection is presentation state, never a casebook write.
 * Only the existing public case may depart. Other entries are UI-only fixtures. */
const destinationOptions=Array.isArray(destinationPreview)?clone(destinationPreview):[];
let selectedDestinationId=null;
root.dataset.destinationPreview=String(destinationOptions.length>0);
function destinationItem(){
 const item=destinationOptions.find(x=>x.id===selectedDestinationId)||destinationOptions.find(x=>x.id===d()?.case?.id)||destinationOptions[0];
 if(!item)return null;
 const current=item.id===d()?.case?.id&&!item.previewOnly;
 return {...item,current,name:current?title:item.name,
  status:current?(d().case.status==='resolved'?'踏破済み':'未踏破'):item.status,
  objective:current?(d().texts?.[d().case.objective_text_id]?.short_text||'目的は出発時に確認できます。'):item.objective};
}
function destinationCanDepart(){if(connectedAcquisition()&&(dirty()||state.pending||state.canRetry||state.stale||!session.can('depart')))return false;return !(acquisitionPreview&&collection?.modified())&&(!destinationOptions.length||destinationItem()?.current===true);}
function destinationHeading(){return destinationItem()?.name||title;}
function destinationClues(item){return '<div class="cj-destination-clues">'+(item.clues||[]).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>';}
function destinationBoard(){
 const selected=destinationItem();
 const choices=destinationOptions.map(item=>{
  const on=item.id===selected.id,current=item.id===d().case.id&&!item.previewOnly;
  const status=current?(d().case.status==='resolved'?'踏破済み':'未踏破'):item.status;
  return button('<span class="cj-destination-check" aria-hidden="true">'+icon(on?'check':'map-pin')+'</span><span class="cj-destination-name">'+esc(current?title:item.name)+'</span><small>'+esc(status)+'</small><span class="cj-destination-hint">'+esc(item.clues.join(' · '))+'</span>',
   'select-destination','data-id="'+esc(item.id)+'" data-focus="destination-'+esc(item.id)+'" aria-pressed="'+on+'" aria-controls="cj-selected-destination"','cj-destination-choice');
 }).join('');
 return '<section class="cj-fixed-hub cj-destinations">'+landscape()+
  '<div class="cj-destination-list" role="group" aria-label="探索先を一つ選択">'+choices+'</div>'+
  '<section id="cj-selected-destination" class="cj-selected-destination" aria-label="選択中の探索先" aria-live="polite" aria-atomic="true">'+
   '<small>'+esc(selected.status)+'</small><h2>'+esc(selected.name)+'</h2>'+destinationClues(selected)+
   '<h3>目的</h3><p class="cj-prose">'+esc(selected.objective)+'</p>'+button('詳細','destination','aria-label="'+esc(selected.name)+'の詳細"')+'</section></section>';
}
function destinationDescription(){
 const item=destinationItem();
 if(!item)return '<p>'+esc(d().texts?.[d().case.objective_text_id]?.short_text||'目的は出発後の本文で確認できます')+'</p>';
 return '<h3>目的</h3><p class="cj-prose">'+esc(item.objective)+'</p><h3>攻略の手掛かり</h3>'+destinationClues(item);
}

 /* Presentation helpers injected into mountJourney. No private catalogue or price calculation. */
function paragraph(id){const t=d().texts?.[id];return t?'<p data-j-text="'+esc(id)+'">'+esc(t.short_text||t.detail_text||'')+'</p>':'';}
// These public details are short paragraphs. Render them in reading order;
// visibility observation, never DOM insertion, decides the read receipt.
function sceneCopy(){const s=d().scene;if(!s)return '';return '<div class="cj-story">'+[...new Set([...(s.text_ids||[]),...(s.optional_text_ids||[])])].map(paragraph).join('')+'</div>';}
function wallet(){const now=h()?.economy.unspent_units,after=state.comparison?.ok?(state.comparison.payment?.unspent_after_units??state.comparison.stages?.prepared.unspent_units):null;
 return '<div class="cj-wallet"><span>'+icon('lightbulb')+'着想</span><strong>'+pt(now)+'</strong>'+(dirty()?'<span class="cj-arrow">→</span><strong class="cj-changed">'+pt(after)+'</strong><small>変更案</small>':committedFlash?'<small>確定済み</small>':'')+'</div>';}
function outcome(){return ({clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'})[d().return_receipt?.outcome]||'探索終了';}
function landscape(){const a=api.sceneArtwork?.(d());return '<div class="cj-landscape cj-backdrop" aria-hidden="true"'+(a?' data-artwork="'+a.id+'" style="background-image:url('+a.src+');background-position:'+a.position+'"':'')+'><div></div><div></div><div></div></div>';}
function readWindow(){return d().scene?'<section class="cj-reading-window" aria-label="場面の本文"><div class="cj-reading-scroll" data-reading="'+esc(d().scene.id)+'">'+sceneCopy()+'</div></section>':'';}
function returnView(){const r=d().return_receipt;if(!r)return '<p>帰還結果を読み込めませんでした</p>';
 const materials=(r.kept_items||[]).filter(x=>x.kind!=='points'),unlocks=r.new_unlocks||[],lost=r.lost_items||[];
 const materialLabel=materials.length===1?'素材 '+esc(materials[0].type||'')+' +'+esc(materials[0].amount||1):'素材 '+materials.length+'種';
 return '<section class="cj-fixed-result">'+landscape()+'<section class="cj-result-summary" aria-label="帰還の結果"><div class="cj-result-values">'+
 '<div class="cj-result-money">'+icon('lightbulb')+'<span>着想</span><strong>+'+pt(r.gained_units)+'</strong><small>計 '+pt(r.unspent_after_units)+'</small></div><div>余力 '+esc(r.expedition_end_hp)+' → '+esc(r.home_hp)+'</div>'+
 '<div class="cj-result-items"><span>'+materialLabel+'</span><span>記録 +'+unlocks.length+(lost.length?'　喪失 '+lost.length:'')+'</span></div></div>'+button('詳細','receipt','aria-label="帰還結果の詳細"')+'</section>'+readWindow()+'</section>';
}
function receiptDetails(){const r=d().return_receipt;if(!r)return '';
 return '<div class="cj-change"><span>着想</span><strong>+'+pt(r.gained_units)+'（合計 '+pt(r.unspent_after_units)+'）</strong></div><div class="cj-change"><span>余力</span><strong>'+esc(r.expedition_end_hp)+' → '+esc(r.home_hp)+'</strong></div><h3>獲得品</h3>'+((r.kept_items||[]).filter(x=>x.kind!=='points').map(x=>'<p>素材 '+esc(x.type||'')+' +'+esc(x.amount||1)+'</p>').join('')||'<p>なし</p>')+'<h3>記録に追加</h3>'+(r.new_unlocks||[]).map(id=>detailsButton('base:'+id)).join('')+((r.lost_items||[]).length?'<h3>喪失</h3>'+r.lost_items.map(x=>'<p>'+esc(x.kind==='points'?'着想':x.type||x.kind)+' '+esc(x.kind==='points'?pt(x.amount_units):x.amount??'')+'</p>').join(''):'');
}
function hubView(){if(destinationOptions.length)return destinationBoard();const objective=d().texts?.[d().case.objective_text_id];return '<section class="cj-fixed-hub">'+landscape()+'<section class="cj-destination-summary"><small>'+(d().case.status==='resolved'?'踏破済み':'探索先')+'</small><div class="cj-destination-heading"><h2>'+esc(title)+'</h2>'+button('詳細','destination','aria-label="'+esc(title)+'の詳細"')+'</div><p class="cj-prose">'+esc(objective?.short_text||'')+'</p></section></section>';}
function compactWallet(){if(acquisitionPreview&&collectionState)return '<span class="cj-compact-wallet" aria-label="着想">'+icon('lightbulb')+'<span>'+esc(collectionState.wallet)+(collectionState.pending?' → '+esc(collectionState.wallet-collectionState.pending):'')+'</span></span>';const now=h()?.economy.unspent_units,after=state.comparison?.ok?(state.comparison.payment?.unspent_after_units??state.comparison.stages?.prepared.unspent_units):null;return '<span class="cj-compact-wallet" aria-label="着想 現在 '+pt(now)+(dirty()?'、変更案 '+pt(after):committedFlash?'、確定済み':'')+'">'+icon('lightbulb')+'<span>'+pt(now)+(dirty()?'<span class="cj-changed">→'+pt(after)+'</span>':'')+'</span></span>';}
function catalogueItems(){if(tab==='offers')return h().offers.status==='purchased'?[]:h().candidates.map(x=>x.id);if(tab==='owned')return h().owned.map(x=>x.id);const skills=tab==='skills';const items=[...(skills?h().learning_options.map(x=>'base:'+x.base):h().free_card_options),...h().owned.filter(x=>x.selection_kind===(skills?'equipment':'deck')).map(x=>x.id),...(p()?.candidate&&p().purchase_timing==='before_preparation'&&info(p().candidate).kind===(skills?'passive':'card')?['$purchase']:[])];
 return !skills||skillFilter==='all'?items:items.filter(id=>skillFilter==='learned'?currentlyLearned(info(id).base_id):currentlyEquipped(id));
}
function currentlyLearned(base){return h()?.economy.learned?.some(x=>x.base===base);}
function currentlyEquipped(id){return h()?.equipment.entries.some(x=>x.id===id);}
function skillState(id){const item=info(id),wasKnown=currentlyLearned(item.base_id),wasOn=currentlyEquipped(id),known=learned(item.base_id),on=equipped(id);
 const now=wasKnown?'習得済み'+(wasOn?'・装備中':''):'未習得';
 const changes=[];if(wasKnown!==!!known)changes.push(known?'覚える':'忘れる');if(wasOn!==!!on)changes.push(on?'装備':'外す');
 return now+(changes.length?' → '+changes.join('・')+'予定':'');
}
function itemFace(id,metadata,selected=false){return button('<span class="cj-item-icon" aria-hidden="true">'+icon(itemIcon(id))+'</span><strong>'+esc(name(id))+'</strong><small>'+metadata+'</small>','detail','data-id="'+esc(id)+'" data-focus="detail-'+esc(id)+'" data-tooltip="'+esc(name(id))+'" aria-label="'+esc(name(id))+'の詳細" aria-pressed="'+selected+'"','cj-item-face');}
function skillActions(id){const item=info(id),known=learned(item.base_id),on=equipped(id),cancelled=p().cancel_learning.includes(item.base_id),planned=p().next_preparation.learn.includes(item.base_id);
 const extra='data-id="'+esc(id)+'" data-j-mutation';
 if(cancelled)return button('忘れる案を戻す','restore-skill',extra);
 if(!known)return button('覚える','learn',extra+' data-focus="learn-'+esc(id)+'"')+button('覚えて装備','equip',extra+' data-focus="equip-'+esc(id)+'"','cj-primary');
 return button(planned?'習得案を戻す':'忘れる','forget',extra)+button(on?'外す':'装備','equip',extra+' data-focus="equip-'+esc(id)+'"',on?'':'cj-primary');
}
function composeCount(){if(tab==='offers')return h().offers.status==='purchased'?'購入済':h().offers.carried_from_previous_return?'持越し':h().candidates.length+'点';if(tab==='owned')return h().owned.length+'点';const c=state.comparison;return tab==='skills'?(c?.ok?c.prepared.equipment.used:dirty()?'—':h().equipment.used)+'/'+h().equipment.capacity:p().next_preparation.deck.length+'/'+h().deck.required_size;}
function pageButtons(){const layout=api.journeyLayout(frameWidth,catalogueItems().length,pageAnchors[tab],0);return layout.pages>1?'<div class="cj-pager" aria-label="一覧のページ">'+button(icon('chevron-left'),'page','data-step="-1" aria-label="前の一覧" '+(!layout.page?'disabled':''))+'<span aria-live="polite">'+(layout.page+1)+'/'+layout.pages+'</span>'+button(icon('chevron-right'),'page','data-step="1" aria-label="次の一覧" '+(layout.page+1===layout.pages?'disabled':''))+'</div>':'';}
function headerView(screen){const edit=['deck','skills','offers','owned'].includes(screen),labels={return:outcome(),hub:'探索先',scene:title,start:'crossweave'},tabs={deck:'札組',skills:'心得',offers:'購入',owned:'所持'};
 const lead=edit?'<nav class="cj-edit-tabs" aria-label="編成と購入の切替">'+Object.entries(tabs).map(([t,label])=>button('<span>'+label+'</span>'+(tab===t?'<small>'+composeCount()+'</small>':''),t,'aria-pressed="'+(tab===t)+'"')).join('')+'</nav>':'<h1 class="cj-screen-title">'+esc(labels[screen]||'crossweave')+'</h1>';
 const selection=tab==='skills'?'skills:'+skillFilter:tab;
 const mobile=[['deck','札組'],['skills:all','心得・すべて'],['skills:learned','心得・習得済み'],['skills:equipped','心得・装備中'],['offers','購入'],['owned','所持']];
 const filter=tab==='skills'?'<select data-skill-filter class="cj-skill-filter" aria-label="現在の心得を絞り込む">'+[['all','すべて'],['learned','習得済み'],['equipped','装備中']].map(([v,l])=>'<option value="'+v+'" '+(skillFilter===v?'selected':'')+'>'+l+'</option>').join('')+'</select>':'';
 const shortcut=unifiedAcquisition()&&screen==='hub'?button('編成','collection','aria-label="札と心得を取得・編成する"','cj-back'):screen==='scene'&&!d().scene?.paused?button(icon('arrow-left')+'戻る','scene-back','aria-label="探索に戻る"','cj-back'):'';
 return shortcut+lead+(edit?'<select data-compose-tab class="cj-compose-select" aria-label="編成と購入の切替">'+mobile.map(([v,l])=>'<option value="'+v+'" '+(selection===v?'selected':'')+'>'+l+'</option>').join('')+'</select>'+filter+pageButtons():'')+(h()?compactWallet():'')+api.commonNavigationHTML();
}
function composeActions(){const c=state.comparison;return button('<span>'+(dirty()?'比較':'構成を見る')+'</span>','review','aria-label="'+(dirty()?'現在と変更案を比較':'現在の札組・心得・着想を確認')+'"','cj-review-button')+(dirty()?button('確定','commit','data-j-mutation '+(!c?.ok?'disabled':'')):'')+button(dirty()?'確定して出発':'出発','depart','data-j-mutation '+(dirty()&&!c?.ok||!destinationCanDepart()?'disabled':''),'cj-primary');}
function footerView(screen){let content='';
 if(['deck','skills','offers','owned'].includes(screen))content=button(icon('arrow-left')+'戻る','hub','aria-label="編成を閉じて拠点に戻る"')+'<div class="cj-fixed-actions">'+(screen==='owned'&&conversionIds.size?button('着想に変える '+conversionIds.size+'点','convert-preview','data-j-mutation','cj-primary'):composeActions())+'</div>';
 else if(screen==='return')content='<span></span>'+button(unifiedAcquisition()?'進む':'拠点へ','hub','data-j-mutation','cj-primary');
 else if(screen==='hub'&&unifiedAcquisition())content='<span></span><div class="cj-fixed-actions"><span class="cj-selected-label">'+esc(destinationHeading())+'</span>'+button('出発','depart','data-j-mutation '+(!destinationCanDepart()?'disabled':''),'cj-primary')+'</div>';
 else if(screen==='hub')content='<div class="cj-fixed-actions">'+button('札組','deck')+button('心得','skills')+button('購入','offers')+'</div><div class="cj-fixed-actions">'+(destinationOptions.length?'<span class="cj-selected-label">'+esc(destinationHeading())+'</span>':'')+composeActions()+'</div>';
 else if(screen==='scene'&&d().scene?.paused)content='<span></span>'+button('進む','continue','data-j-mutation','cj-primary');
 else if(screen==='start')content='<small>'+(storageMode==='ephemeral'?'この試作を開いている間だけ保持':'探索を中断中')+'</small>'+button('続きから','resume','data-j-mutation','cj-primary');
 return content?'<div class="cj-fixed-footer">'+content+'</div>':'';
}
function cardTile(id){const item=info(id),n=count(id),current=count(id,api.currentPlan(state.view).next_preparation.deck),kind=item.primary?.kind;
 const baseCount=p().next_preparation.deck.filter(x=>info(x).base_id===item.base_id).length;
 const effect=item.primary?(kind==='defense_support'?'身構付与 '+item.primary.defense_grant.guard:({attack:'突破',guard:'身構',heal:'回復'})[kind]+' '+item.primary.power):'';
 return '<article class="cj-cardpiece cj-item '+(n?'cj-included':'')+'" data-piece="'+esc(id)+'">'+itemFace(id,esc([effect,possessionLabel(id)].filter(Boolean).join(' · ')),selected.deck===id)+
 '<div class="cj-counter cj-item-actions">'+button('−','remove','data-id="'+esc(id)+'" data-focus="remove-'+esc(id)+'" data-j-mutation aria-label="'+esc(name(id))+'を1枚外す" '+(!n?'disabled':''))+'<span aria-label="現在 '+current+'枚、変更案 '+n+'枚">'+(n!==current?'<small>'+current+' →</small> ':'')+'<strong>'+n+'</strong></span>'+button('+','add','data-id="'+esc(id)+'" data-focus="add-'+esc(id)+'" data-j-mutation aria-label="'+esc(name(id))+'を1枚加える" '+(baseCount>=h().deck.per_base_cap||(!id.startsWith('base:')&&n)?'disabled':''))+'</div></article>';
}
function skillStructure(item){return api.effectHTML(item);}
function skillTile(id){const item=info(id),on=equipped(id);
 const metadata=skillState(id)+' · 枠消費 '+item.equipment_cost+(!learned(item.base_id)?' · 習得 −'+pt(item.learning_cost_units):'');
 return '<article class="cj-skillpiece cj-cardpiece cj-item '+(on?'cj-included':'')+'" data-piece="'+esc(id)+'">'+itemFace(id,esc(metadata),selected.skills===id)+'<div class="cj-item-actions">'+skillActions(id)+'</div></article>';
}
function composeView(){const items=catalogueItems(),economy=['offers','owned'].includes(tab),layout=api.journeyLayout(frameWidth,items.length,pageAnchors[tab]);
 const empty=tab==='skills'?(skillFilter==='equipped'?'今は装備している心得がありません':skillFilter==='learned'?'今は覚えている心得がありません':'心得なし'):tab==='offers'?offerStatus():'所持品なし';
 return '<section class="cj-page-catalogue" data-catalogue aria-label="'+({skills:'心得一覧',deck:'札一覧',offers:'購入候補',owned:'所持品'})[tab]+'" style="padding:'+layout.padding+'px">'+(items.length?'<div class="cj-page-grid" data-capacity="'+layout.capacity+'" style="grid-template-columns:repeat('+layout.columns+',minmax(0,1fr));grid-template-rows:repeat('+layout.rows+','+layout.rowHeight+'px);gap:'+layout.gap+'px">'+items.slice(layout.start,layout.end).map(economy?economyTile:tab==='skills'?skillTile:cardTile).join('')+'</div>':'<div class="cj-empty"><p>'+esc(empty)+'</p>'+(tab==='offers'&&h().offers.status==='purchased'?button('所持を見る','owned'):'')+'</div>')+'</section>';
}
function miniList(ids){return ids.length?'<ul class="cj-build-list">'+group(ids).map(x=>'<li><span>'+esc(name(x.id))+'</span><b>×'+x.count+'</b></li>').join('')+'</ul>':'<span class="cj-muted">なし</span>';}
function changeRows(){const c=state.comparison;if(!c)return '<p class="cj-muted">'+(state.pending?'確認中…':'変更の確認待ち')+'</p>';if(!c.ok)return '<p class="cj-warning" role="alert">'+esc(reason(c.refusal))+'</p>';
 const rows=[];const row=(object,change)=>rows.push('<div class="cj-change"><span>'+esc(object)+'</span><strong>'+change+'</strong></div>');
 if(c.cancellation.bases.length)row(c.cancellation.bases.map(id=>name('base:'+id)).join('・')+'を忘れる','着想 +'+pt(c.cancellation.actual_refund_units));
 if(c.purchase?.performed_on_copy)row(name(p().candidate)+'を所持に追加','着想 −'+pt(c.purchase.cost_units));
 if(p().next_preparation.learn.length)row(p().next_preparation.learn.map(id=>name('base:'+id)).join('・')+'を覚える','着想 −'+pt(c.learning.payment_units));
 for(const [key,verb]of [['removed','外す'],['added','装備']])for(const x of c.differences.equipment[key])row(name(x.id),verb);
 const initial=api.currentPlan(state.view).next_preparation.deck;
 for(const id of new Set([...c.differences.deck.added,...c.differences.deck.removed].map(x=>x.id)))row(name(id),count(id,initial)+' → '+count(id)+'枚');
 return '<div class="cj-changes">'+rows.join('')+'</div><div class="cj-change"><span>所持</span><strong>'+h().owned.length+' → '+c.prepared.owned.length+'</strong></div>'+ (c.purchase?.performed_on_copy?'<dl class="cj-record-stats"><div><dt>取消後</dt><dd>'+pt(c.stages.after_cancellation.unspent_units)+'</dd></div><div><dt>購入前 → 後</dt><dd>'+pt(c.stages.before_purchase.unspent_units)+' → '+pt(c.stages.after_purchase.unspent_units)+'</dd></div><div><dt>確定後</dt><dd>'+pt(c.stages.prepared.unspent_units)+'</dd></div></dl>':'');
}
function summaryContents(){const c=state.comparison;
 return '<div class="cj-setup-line"><span>心得</span><div>'+miniList(p().next_preparation.equipment)+'</div></div><div class="cj-setup-line"><span>札組</span><strong>'+p().next_preparation.deck.length+'枚</strong></div>'+
 (dirty()?'<div class="cj-summary-diff">'+changeRows()+'</div>':'')+
 '<div class="cj-summary-actions">'+button(dirty()?'確定して出発':'出発 '+icon('arrow-right'),'depart','data-j-mutation '+(dirty()&&!c?.ok||!destinationCanDepart()?'disabled':''),'cj-primary')+
 (dirty()?'<div>'+button('確定','commit','data-j-mutation '+(!c?.ok?'disabled':''))+button('比較','review')+'</div>':'')+'</div>';
}
function sceneView(){return '<section class="cj-fixed-scene">'+landscape()+readWindow()+'</section>';}
function startView(){return '<section class="cj-fixed-start"><h2>'+esc(title)+'</h2><span>crossweave</span></section>';}
function cardFacts(item,snapshot=false){
 if(item.kind==='passive')return skillStructure(item)+affixView(item);
 const p=snapshot?item:item.primary,field=snapshot?{power:item.field_power,hit:item.field_hit}:item.field;
 const row=(term,value,shape)=>value==null?'':'<div><dt>'+(shape?icon(shape):'')+term+'</dt><dd>'+esc(value)+'</dd></div>';
 let primary='';
 if(p?.kind==='defense_support'){primary+=row('全員へ身構',p.defense_grant?.guard,'shield')+row('全員へ攪乱',p.defense_grant?.evasion,'wind');}else if(p){primary+=row(p.kind==='guard'?'身構':p.kind==='heal'?'回復':'突破',p.power,p.kind==='guard'?'shield':p.kind==='heal'?'heart-plus':'arrow-up-right');
  if(p.kind!=='heal')primary+=row(p.kind==='guard'?'攪乱':'探査',p.kind==='guard'?p.evasion:p.hit,p.kind==='guard'?'wind':'scan-search');primary+=row('機転',p.crit_gain,'zap');}
 const properties=api.effectHTML(item);
 return '<dl class="cj-record-stats">'+(snapshot?row('属性',item.attr):'')+primary+row('手札期限',item.life)+'</dl>'+
  (field&&(field.power!=null||field.hit!=null)?'<h3>場に置くと</h3><dl class="cj-record-stats">'+row('突破／身構',field.power,'arrow-up-right')+row('探査／攪乱',field.hit,'scan-search')+'</dl>':'')+
  '<h3>次の行動まで</h3><dl class="cj-record-stats">'+row('置く',snapshot?item.place_cost:item.action_intervals?.place)+row('一致',snapshot?item.match_cost:item.action_intervals?.match)+'</dl>'+
  properties;
}
function detailView(id,{back=false,w=windows.find(x=>x.id===id)}={}){const item=info(id),base=item.base_id,passive=item.kind==='passive',known=learned(base),cancelled=p()?.cancel_learning?.includes(base);
 const pinLabel=w?.pinned?'固定を外す':'固定する';
 const head='<div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2 data-tooltip="'+esc(name(id))+'">'+esc(name(id))+'</h2>'+button(icon('pin'),'pin','data-id="'+esc(id)+'" aria-label="'+pinLabel+'" data-tooltip="'+pinLabel+'" aria-pressed="'+!!w?.pinned+'"','cj-icon-button')+(!back?button(icon('x'),'close-item','data-id="'+esc(id)+'" aria-label="詳細を閉じる"','cj-icon-button'):'')+'</div>';
 let body='',actions='';
 if(passive)body+='<div class="cj-detail-cost"><span>枠消費</span><strong>'+item.equipment_cost+'</strong></div>'+skillStructure(item);
 else body+=cardFacts(item);
 body+=affixView(item);
 if(h()?.owned.some(x=>x.id===id)){const row=h().owned.find(x=>x.id===id);body+='<p>'+esc((row.references||[]).map(x=>usageLabels[x]||'使用中').join('・')||(row.eligibility_reason==='owned_but_base_not_learned'?'基礎の心得は未習得':'所持'))+'</p>';}
 if(!connectedAcquisition()&&d().phase==='home'&&passive&&(id.startsWith('base:')||h().owned.some(x=>x.id===id)||id==='$purchase')){actions=skillActions(id);
  body='<p class="cj-skill-state">'+esc(skillState(id))+'</p>'+body+(!known?'<p>覚える費用：着想 −'+pt(item.learning_cost_units)+'</p>':'');
 }else if(!connectedAcquisition()&&d().phase==='home'&&(h().free_card_options.includes(id)||h().owned.some(x=>x.id===id)||id==='$purchase'))actions=button('−1枚','remove','data-id="'+esc(id)+'" data-j-mutation '+(!count(id)?'disabled':''))+ '<strong>'+count(id)+'枚</strong>'+button('+1枚','add','data-id="'+esc(id)+'" data-j-mutation '+(p().next_preparation.deck.filter(x=>info(x).base_id===base).length>=h().deck.per_base_cap||(!id.startsWith('base:')&&count(id))?'disabled':''));
 else if(!h()?.owned.some(x=>x.id===id)&&!(h()?.free_card_options||[]).includes(id)&&item.kind==='card')body+='<p class="cj-muted">未所持。解放された札と、所持している札は別です。</p>';
 return '<section class="cj-inspect-item" data-inspect-key="'+esc(id)+'">'+head+'<div class="cj-inspect-scroll">'+body+'</div><div class="cj-detail-actions">'+actions+'</div></section>';
}
// D03 presentation and explicit commands only. Prices, eligibility and quotes
// are supplied by Campaign. No inventory IDs or blueprint parsing here.
const usageLabels={equipment:'装備中',confirmed_deck:'札組で使用中',saved_draft_equipment:'保存した装備案',saved_draft_deck:'保存した札組案'};
function economyFailure(e){
 const labels={stale_or_unknown_candidate:'候補が入れ替わりました。最新を読み、選び直してください',offer_already_purchased:'この候補からは購入済みです',missing_possession:'所持品が変わりました。最新を読み、選び直してください',unknown_selection_handle:'選択が古くなりました。最新を読み、選び直してください',return_not_acknowledged:'帰還結果を確認して拠点へ進んでください',item_locked:'保護中です。着想に変えるには保護を解除してください',item_in_use:'札組・装備・保存した案で使用中です',purchase_not_yet_available:'購入前の編成には購入予定品を使えません',unlearned_equipment_base:'先に基礎の心得を覚えてください',insufficient_unspent_funds:'着想が足りません',unsaved_draft:'編成案を確定するか、変更案を戻してください',duplicate_owned_card:'同じ所持札は1枚だけ使えます',duplicate_equipment:'同じ個体を重ねて装備できません'};
 const detail=e?.details,amount=e?.purchase_request?.shortage_units;
 return labels[e?.code] ? labels[e.code]+(Number.isFinite(amount)?'（不足 '+pt(amount)+'）':e.code==='insufficient_unspent_funds'&&Number.isFinite(detail?.required_units)?'（必要 '+pt(detail.required_units)+'／現在 '+pt(detail.available_units)+'）':'') : null;
}
function affixView(item){return item?.affixes?.length?'<section class="cj-affixes"><h3>修飾</h3>'+item.affixes.map(a=>{const lines=api.explanationLines(a.description),conditions=lines.filter(x=>/限定$/.test(x)),effects=lines.filter(x=>!/限定$/.test(x));return '<h4>'+esc(a.label)+'</h4>'+api.effectHTML({trigger_text:conditions.join('／'),effect_text:effects.join('／')});}).join('')+'</section>':'';}
function possessionLabel(id){return id==='$purchase'?'購入予定':h()?.owned.some(x=>x.id===id)?'所持1':h()?.free_card_options.includes(id)?'無料札':'';}
function offerStatus(){const offers=h().offers;return offers.status==='purchased'?(offers.carried_from_previous_return?'前の探索の候補から1点購入済み':'この探索の成果から1点購入済み'):offers.status==='none'?(offers.reason==='no_eligible_offer'?'条件に合う購入候補なし':'購入候補なし'):offers.carried_from_previous_return?'前の探索から持ち越した候補':'この探索の成果 · 1点選んで購入';}
function economyTile(id){
 const owned=tab==='owned',row=(owned?h().owned:h().candidates).find(x=>x.id===id),item=info(id);
 if(!row)return '';
 const pendingPurchase=p()?.candidate===id;
 const metadata=owned?[...(row.references||[]).map(r=>usageLabels[r]||'使用中'),row.locked?'保護中':null].filter(Boolean).join(' · ')||'所持1点':(item.kind==='passive'?'心得の個体':'札の個体')+' · 着想 −'+pt(row.price_units);
 const details=itemFace(id,esc(metadata));
 let controls='';
 if(owned){
  controls=button(row.locked?'保護を解除':'保護','lock','data-id="'+esc(id)+'" data-j-mutation '+(dirty()||!session.can('set_item_lock')?'disabled':'')+' data-tooltip="着想への変換を防ぐ" aria-pressed="'+row.locked+'"');
  controls+=button(conversionIds.has(id)?'✓ 選択中':row.conversion_available?'着想に変える':row.locked?'保護中':'使用中','convert-select','data-id="'+esc(id)+'" '+(!row.conversion_available||dirty()?'disabled':'')+' aria-pressed="'+conversionIds.has(id)+'"');
 }else{
  controls=button(pendingPurchase?'✓ 購入案':'編成と比較','plan-purchase','data-id="'+esc(id)+'" data-j-mutation '+(!row.available||d().phase!=='home'?'disabled':''));
  controls+=button(!row.available?'購入不可':!row.affordable_now?'着想不足':'購入 −'+pt(row.price_units),'buy-preview','data-id="'+esc(id)+'" '+(!row.available||!row.affordable_now||!session.can('purchase')||dirty()?'disabled':''));
 }
 return '<article class="cj-cardpiece cj-economy-piece cj-item '+(pendingPurchase||conversionIds.has(id)?'cj-included':'')+'" data-piece="'+esc(id)+'">'+details+'<div class="cj-item-actions">'+controls+'</div></article>';
}
function purchasePanel(){const row=h()?.candidates.find(x=>x.id===purchaseChoice);if(!row)return {body:'<p>対象を選び直してください</p>',actions:''};
 return {body:'<h3>'+esc(name(row.id))+'</h3><p>所持に1点追加</p>'+(info(row.id).kind==='passive'?'<p>習得・装備は「心得」で選ぶ</p>':'')+'<div class="cj-change"><span>購入額</span><strong>−'+pt(row.price_units)+'</strong></div><p>現在の着想 '+pt(h().economy.unspent_units)+'</p>'+affixView(info(row.id)),actions:button('購入する','buy-confirm','data-j-mutation '+(!row.available||!row.affordable_now||!session.can('purchase')||dirty()?'disabled':''),'cj-primary')};
}
function conversionPanel(){const q=state.quote;
 if(!q)return {body:'<p>'+(state.error?esc(reason(state.error)):'変換額を確認中…')+'</p>',actions:''};
 return {body:q.items.map(item=>'<section class="cj-convert-row"><h3>'+esc(name(item.id))+'</h3><span>この個体を失い、着想 +'+pt(item.units)+'</span>'+(item.loses_variant_access?'<p class="cj-warning">最後の1点。この修飾個体は使えなくなる。</p>':item.free_option_retained?'<p>基本の札・心得は残る。</p>':'')+'</section>').join('')+'<div class="cj-change"><span>着想</span><strong>'+pt(q.unspent_before_units)+' → '+pt(q.unspent_after_units)+'</strong></div>',actions:button(q.removed_count+'点を着想に変える','convert-confirm','data-j-mutation '+(!session.can('convert_items')||dirty()?'disabled':''),'cj-primary')};
}
function purchasePlanControls(){if(!p()?.candidate)return '';
 return '<section class="cj-purchase-plan"><h3>購入案：'+esc(name(p().candidate))+'</h3><div>'+button('購入してから編成','purchase-order','data-order="before_preparation" data-j-mutation aria-pressed="'+(p().purchase_timing==='before_preparation')+'"')+button('編成してから購入','purchase-order','data-order="after_preparation" data-j-mutation aria-pressed="'+(p().purchase_timing==='after_preparation')+'"')+'</div>'+button('購入案を外す','clear-purchase','data-j-mutation')+'</section>';
}
async function economyAction(action,id,b){
 if(action==='plan-purchase'){if(d().phase!=='home'||!h().candidates.find(x=>x.id===id)?.available)return true;
  await edit(next=>{next.next_preparation.deck=next.next_preparation.deck.filter(x=>x!=='$purchase');next.next_preparation.equipment=next.next_preparation.equipment.filter(x=>x!=='$purchase');next.candidate=next.candidate===id?null:id;next.purchase_timing='before_preparation';});
  if(p().candidate){skillFilter='all';tab=info(id).kind==='passive'?'skills':'deck';place='compose';pageAnchors[tab]=Math.max(0,catalogueItems().length-1);}panel='review';render();return true;
 }
 if(action==='purchase-order'){await edit(next=>next.purchase_timing=b.dataset.order);return true;}
 if(action==='clear-purchase'){await edit(next=>{next.candidate=null;next.next_preparation.deck=next.next_preparation.deck.filter(x=>x!=='$purchase');next.next_preparation.equipment=next.next_preparation.equipment.filter(x=>x!=='$purchase');});return true;}
 if(action==='buy-preview'){if(busy())return true;purchaseChoice=id;rememberAnchor(b);panelTrail=[];panel='purchase';render();return true;}
 if(action==='buy-confirm'){const candidate=purchaseChoice;if(!candidate)return true;await sequence(async()=>{const result=await session.execute('purchase',{candidate});if(result.ok){resetWindows();place='compose';tab='owned';message='所持に追加';}});return true;}
 if(action==='lock'){const row=h()?.owned.find(x=>x.id===id);if(row)await perform('set_item_lock',{item_id:id,locked:!row.locked});return true;}
 if(action==='convert-select'){if(busy()||!h()?.owned.find(x=>x.id===id)?.conversion_available)return true;if(conversionIds.has(id))conversionIds.delete(id);else conversionIds.add(id);render();return true;}
 if(action==='convert-preview'){if(busy()||!conversionIds.size)return true;rememberAnchor(b);panelTrail=[];panel='conversion';await session.quote([...conversionIds].sort());render();return true;}
 if(action==='convert-confirm'){const ids=state.quote?.items.map(x=>x.id);if(!ids)return true;await perform('convert_items',{item_ids:ids});return true;}
 return false;
}

// Read-only views of public knowledge; snapshots are not resolved through private IDs.
function recordButton(key,entry){
 recordEntries.set(key,entry);
 return button('<span>'+esc(entry.name)+'</span>'+icon('chevron-right'),'record-detail','data-id="'+esc(key)+'" aria-expanded="'+(recordDetail?.key===key)+'"','cj-record-link');
}
function recordedCards(rows,counts=false,scope=''){
 return '<table class="cj-record-cards"><thead><tr><th>札</th><th>属性</th>'+(counts?'<th>初期枚数</th>':'')+'</tr></thead><tbody>'+rows.map((row,i)=>'<tr><td>'+recordButton(scope+':'+i,{name:row.card.name,snapshot:row.card})+'</td><td>'+esc(row.card.attr)+'</td>'+(counts?'<td>'+esc(row.initial_count)+'</td>':'')+'</tr>').join('')+'</tbody></table>';
}
function recordsView(){
 recordEntries.clear();
 const tabs='<div class="cj-record-tabs">'+button('相手・環境','record-tab','data-tab="targets" aria-pressed="'+(recordTab==='targets')+'"')+button('札','record-tab','data-tab="cards" aria-pressed="'+(recordTab==='cards')+'"')+'</div>';
 if(recordTab==='cards'){
  const cards=(d().case?.unlocked_card_ids||[]).map(base=>'base:'+base).filter(id=>info(id).name);
  return tabs+'<p class="cj-record-purpose">判明した札の性能</p><div class="cj-record-list">'+cards.map(id=>recordButton(id,{name:name(id),detail:info(id)})).join('')+'</div>';
 }
 return tabs+'<p class="cj-record-purpose">探索で判明した構成と札</p><div class="cj-record-targets">'+list(d().knowledge_views).map(target=>{
  const catalogue=target.initial_catalogue?.cards,open=recordTarget===target.key;
  const versions=list(d().knowledge_views).filter(t=>t.target_id===target.target_id),version=versions.length>1?'・記録 '+(versions.findIndex(t=>t.key===target.key)+1):'',current=Object.values(d().exploration?.actors||{}).some(a=>a.knowledge_key===target.key)?'・今回の相手':'';
  return '<section class="cj-record-target">'+button('<span><strong>'+esc(target.name)+'</strong><small>基本構成 '+(catalogue?'判明':'未判明')+version+current+'</small></span>'+icon('chevron-right'),'record-target','data-id="'+esc(target.key)+'" aria-expanded="'+open+'"')+'</section>';
 }).join('')+'</div>';
}
function recordTargetBody(){
 const target=list(d().knowledge_views).find(t=>t.key===recordTarget);if(!target)return '';
 const catalogue=target.initial_catalogue?.cards;
 const groups=[['observed_by_current_actor','この相手の札'],['observed_elsewhere_this_run','今回の探索で観測'],['observed_earlier','過去の探索で観測']];
 const rewards=target.confirmed_reward_candidates||[];
 return '<h3>基本構成</h3>'+(catalogue?recordedCards(catalogue,true,target.key+':initial'):'<p class="cj-muted">まだ判明していない</p>')+
  groups.map(([key,title])=>target[key]?.length?'<h3>'+title+'</h3>'+recordedCards(target[key],false,target.key+':'+key):'').join('')+
  '<h3>獲得記録</h3>'+(rewards.length?'<ul>'+rewards.map(r=>'<li>'+esc(r.label)+'</li>').join('')+'</ul>':'<p class="cj-muted">記録なし</p>')+
  '<p class="cj-muted">現在の手札・次に出す札は未公開。</p>';
}
// Keep the immediate source visible beside its detail, with a back path to the list.
function recordsPanelView(){
 const parent=recordsView(),target=list(d().knowledge_views).find(t=>t.key===recordTarget);
 const childTitle=recordDetail?.name||target?.name,hasChild=!!childTitle;
 const head=(title,back)=>'<div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'record-back','aria-label="'+esc(back)+'"','cj-record-back'):panelTrail.length?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2>'+esc(title)+'</h2>'+button(icon('x'),'close','aria-label="調査記録を閉じる"','cj-icon-button')+'</div>';
 const pane=(key,title,body,back='')=>'<section class="cj-inspect-item" data-inspect-key="'+esc(key)+'">'+head(title,back)+'<div class="cj-inspect-scroll">'+body+'</div></section>';
 const detailBody=recordTargetBody(); // Also registers public snapshot entries.
 const source=recordDetail&&target?pane('target:'+recordTarget,target.name,detailBody,'調査記録の一覧に戻る'):pane('records:'+recordTab,'調査記録',parent);
 return source+(hasChild?pane(recordDetail?'record:'+recordDetail.key:'target:'+recordTarget,childTitle,recordDetail?recordDetailView():detailBody,recordDetail&&target?target.name+'に戻る':'調査記録の一覧に戻る'):'');
}
function recordDetailView(){
 const entry=recordDetail;return cardFacts(entry.snapshot||entry.detail,!!entry.snapshot);
}

// Public history preserves read/unread; opening it never invents a historical read command.
function textHistoryView(){const rows=list(d().text_history).filter(t=>t.published&&(t.kind!=='detail'||t.read));return rows.length?'<div class="cj-text-history">'+rows.map((t,i)=>'<section data-history-text="'+esc(t.id)+'"><h3>'+('記録 '+(i+1))+'</h3><p class="cj-prose">'+esc(t.short_text||t.detail_text||'')+'</p></section>').join('')+'</div>':'<p>文章の記録はまだありません</p>'; }

function renderPanel(){const box=$('[data-inspector]'),hasChild=panel==='records'&&!!(recordTarget||recordDetail);box.hidden=!panel;box.parentElement.classList.toggle('cj-has-inspector',!!panel);if(!panel){box.replaceChildren();panelTrail=[];recordParentRect=null;return;}
 const level=panelTrail.length,parent=panelTrail.at(-1),withLevel=(markup,n)=>markup.replaceAll('data-inspect-key=', 'data-level="'+n+'" data-inspect-key=');
 let current=panel==='details'?windows.slice(-2).map(w=>detailView(w.id,{w,back:!!parent||windows.length>2})).join(''):panel==='records'?recordsPanelView():panelView(panel,!!parent);
 if(parent&&!hasChild&&windows.length<2)current=withLevel(parent.panel==='details'?parent.windows.slice(-1).map(w=>detailView(w.id,{w,back:level>1})).join(''):panelView(parent.panel,level>1),level-1)+withLevel(current,level);
 else current=withLevel(current,level);
 box.innerHTML=current;box.dataset.count=box.children.length;box.dataset.layout=box.children.length>1?'linked':'windows';
}
function panelView(panel,back=false){
 const titles={review:dirty()?'現在と変更案':committedFlash?'確定後の編成':'現在の編成',records:'調査記録',menu:'メニュー',help:'遊び方',settings:'表示',data:'保存データ',receipt:'帰還の内訳',destination:destinationHeading(),unavailable:'購入・所持',notice:'操作の確認',purchase:'購入の確認',conversion:'着想に変える',texts:'文章の記録'};
 let body='',actions='';
 if(panel==='review'){body=wallet()+(dirty()?changeRows()+purchasePlanControls():'<h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>');actions=dirty()?button('確定','commit','data-j-mutation '+(!state.comparison?.ok?'disabled':''),'cj-primary')+button('確定して出発','depart','data-j-mutation '+(!state.comparison?.ok||!destinationCanDepart()?'disabled':'')):'';}
 if(panel==='receipt')body=receiptDetails();
 if(panel==='destination')body=destinationDescription()+(unifiedAcquisition()?'':'<h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>');
 if(panel==='purchase')({body,actions}=purchasePanel());
 if(panel==='conversion')({body,actions}=conversionPanel());
 if(panel==='texts')body=textHistoryView();
 if(panel==='notice'){body='<p>'+esc(reason(state.error))+'</p>';actions=(state.canRetry?button('もう一度','retry'):'')+(state.stale?button('最新を読む','refresh'):'');}
 if(panel==='records')body=recordsView();
 if(panel==='menu'){
  const items=[['調査記録','records'],['表示','settings'],['遊び方','help'],['保存データ','data'],['文章の記録','texts'],...(!unifiedAcquisition()&&h()?[['購入','offers'],['所持','owned']]:[]),...(currentScreen()==='explore'?[['目的','explore-objective'],['状況','explore-status'],['行動順','explore-order'],['山札','explore-deck'],['履歴','explore-history'],['操作','explore-settings']]:[]),...(canSuspend()?[['中断','suspend']]:[]),...(!unifiedAcquisition()&&dirty()?[['変更案を戻す','discard']]:[])];
  const width=Math.min(520,panelTrail.length?(frameWidth-48)/2:frameWidth-32),height=Math.min(480,frameWidth*9/16-32),cols=width>=280?2:1,rows=Math.max(1,Math.floor((height-144)/56)),capacity=rows*cols,pages=Math.ceil(items.length/capacity);
  menuPage=Math.min(menuPage,pages-1);body='<nav class="cj-menu-grid" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+items.slice(menuPage*capacity,(menuPage+1)*capacity).map(([label,action])=>button(label,action)).join('')+'</nav>';
  actions=pages>1?button(icon('chevron-left'),'menu-page','data-step="-1" aria-label="前のメニュー" '+(!menuPage?'disabled':''))+'<span>'+(menuPage+1)+'/'+pages+'</span>'+button(icon('chevron-right'),'menu-page','data-step="1" aria-label="次のメニュー" '+(menuPage+1===pages?'disabled':'')):'';
 }
 if(panel==='settings')body='<label class="cj-setting"><input type="checkbox" data-motion '+(root.dataset.motion==='reduced'?'checked':'')+'> 動きを抑える</label>';
 if(panel==='help'&&!unifiedAcquisition())body='<h3>編成</h3><p>札の＋／−で枚数を変える。心得は「覚える」と「覚えて装備」を選べる。「習得済み」「装備中」で現在の状態を確認する。名前を押すと発動条件と効果を確認できる。</p><p>着想と構成の差分を見て確定すると、自動保存される。札組と心得の切替では、編集中の内容はそのまま残る。</p><h3>探索</h3><p>「探索を中断」で進行を止め、「続きから」で同じ探索に戻る。中断では撤退・帰還しない。</p><p>札を選び、相手をタップして対象を指定する。相手の選択と同時に詳細を表示する。相手のホールドは使わない。</p><p>予測はもう一度押すと閉じる。札を押し続けて場へ運ぶ操作も使える。低い画面では、同じ札をもう一度押すと札の詳細。</p><h3>予測</h3><p>選んだ札の直後の変化を表示する。隠蔽は攻撃による減少後・再設定前の値。機転などは消費も含む一手解決後の差分。続く相手の行動は含まない。行動予約の「次」は、選んだ行動の後の本人の予約。同時刻の相手は一組で示す。途中の行動で順序や到達可否は変わる。</p><h3>身構と攪乱</h3><p>複数の発生源から受けた防御を合計して表示する。回数が異なる組は「混在」。詳細で内訳を確認できる。</p><h3>購入と所持</h3><p>候補から購入すると所持に加わる。「編成と比較」では購入と札組・心得の変更を一緒に確定できる。心得を買っても、まだ覚えていなければ別に習得が必要。所持品を「保護」すると、着想への変換を防ぐ。「着想に変える」とその個体は失われる。</p><h3>詳細窓</h3><p>ピンで固定し、もう一度押すと固定を外す。矢印で元の窓に戻る。</p><div class="cj-help-symbols">'+[['arrow-up-right','突破'],['scan-search','探査'],['venetian-mask','隠蔽'],['zap','機転'],['shield','身構'],['wind','攪乱']].map(([symbol,label])=>'<span>'+icon(symbol)+label+'</span>').join('')+'</div>';
 if(panel==='help'&&unifiedAcquisition())body='<h3>編成</h3><p>探索先画面の「編成」から札・心得を切り替える。取得可能・所持・編成の間を、ボタンまたはホールド後のドラッグで移せる。取得は支払前に編成へ試せる。「確認する」で差分を見て確定する。「戻す」は未確定の変更をまとめて取り消す。</p><h3>探索</h3><p>札と相手はクリックで選択と詳細を表示する。選んだ札のボタン、またはホールド後のドラッグで行動する。予測の場札も詳細を開ける。</p><h3>共通操作</h3><p>調査記録とメニューは右上。前の画面へ戻る操作は左上、窓を閉じる操作はその窓の右上にある。帰還結果は「進む」で送り、その後の探索先画面から編成できる。</p>' ;
 if(panel==='data'){body='<p>'+(storageMode==='ephemeral'?'この試作は、閉じると保存が失われます。':'確定した操作は自動保存されます。')+'</p>'+(d().phase==='home'?'<p>編成は「確定」で保存します。編集中の内容は、確定するまで保存済みの編成を変えません。</p>':'')+'<p>書き出しは保存済みの内容です。</p>';actions=button('書き出す','export','data-j-mutation')+(canSuspend()?button('探索を中断','suspend','data-j-mutation'):'');}
 return '<section class="cj-inspect-item" data-inspect-key="'+panel+'"><div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2>'+titles[panel]+'</h2>'+button(icon('x'),'close','aria-label="窓を閉じる"','cj-icon-button')+'</div><div class="cj-inspect-scroll">'+body+'</div><div class="cj-detail-actions">'+actions+'</div></section>';
}

 function resetWindows(){panel=null;windows=[];panelTrail=[];recordParentRect=null;recordTarget=null;recordDetail=null;detailFromRecords=false;windowAnchor=null;scrollMemory.clear();}
 function paneRect(b){const r=api.uiRect(b.closest('[data-inspect-key]'),$('.cj-shell'));return r?{left:r.x,top:r.y,width:r.w,height:r.h}:null;}
 function enterPanel(b,next){
  const pane=b.closest('[data-inspect-key]'),level=Number(pane?.dataset.level);
  if(!pane){panelTrail=[];recordParentRect=null;return;}
  if(Number.isInteger(level)&&level<panelTrail.length){const parent=panelTrail[level];panel=parent.panel;windows=clone(parent.windows);panelTrail=panelTrail.slice(0,level);}
  if(panel!==next)panelTrail.push({panel,windows:clone(windows),rect:paneRect(b)});
 }
 function windowBack(){if(panel==='details'&&!panelTrail.length&&windows.length>2){windows.pop();render();return;}const previous=panelTrail.pop();if(previous){panel=previous.panel;windows=previous.windows;}else{panel=null;windows=[];}recordDetail=null;recordTarget=null;recordParentRect=null;render();}
 function focusRecord(){queueMicrotask(()=>{if(!disposed)$('[data-j="record-back"]')?.focus({preventScroll:true});});}
 function rememberAnchor(button){windowAnchor={action:button.dataset.j,id:button.dataset.id,rect:api.uiRect(button,$('.cj-shell'))};}
 function layoutWindows(){
  if(disposed)return;const box=$('[data-inspector]');if(!box||box.hidden){api.layoutProse(root);return;}
  const r=api.uiSpace($('.cj-shell'));if(!r.width||!r.height)return;
  const source=[...root.querySelectorAll('[data-j]')].find(el=>el.dataset.j===windowAnchor?.action&&el.dataset.id===windowAnchor?.id&&!el.closest('[data-inspector]'));
  const anchor=source?api.uiRect(source,$('.cj-shell')):windowAnchor?.rect;
  const many=box.children.length>1;
  const rect=api.placeWindow({width:r.width,height:r.height,anchor,avoid:[{x:0,y:0,w:r.width,h:64},{x:0,y:r.height-64,w:r.width,h:64}],preferredWidth:520,preferredHeight:480,margin:16});
  const styles=q=>({left:q.left+'px',top:q.top+'px',width:q.width+'px',height:q.height+'px',right:'auto',bottom:'auto',maxHeight:'none'});
  if(many){
   Object.assign(box.style,styles({left:0,top:0,width:r.width,height:r.height}));
   const parent=recordParentRect||panelTrail.at(-1)?.rect||rect;
   const pair=api.placeWindowPair({width:r.width,height:r.height,parent,preferredWidth:520,preferredHeight:480,margin:16,gap:16});
   [...box.children].forEach((pane,i)=>Object.assign(pane.style,styles(pair[i])));
  }else Object.assign(box.style,styles(rect));
  api.layoutProse(root);
 }
 function render(){
  if(disposed||!d())return;
  const context=[d().phase,d().case?.attempts,d().scene?.paused?d().scene.id:'active',suspended,sceneRequested].join('|');
  const changed=lastContext!==null&&lastContext!==context;
  if(changed){resetWindows();if(d().phase==='home'&&lastPhase!=='home')place='hub';}
  lastContext=context;lastPhase=d().phase;
  if(viewToken&&viewToken!==state.view.meta.view_token){purchaseChoice=null;conversionIds.clear();selected.deck=selected.skills=null;windows=windows.filter(w=>w.id.startsWith('base:'));panelTrail=[];if(['purchase','conversion'].includes(panel)||panel==='details'&&!windows.length)panel=null;}
  viewToken=state.view.meta.view_token;
  const screen=currentScreen(),beforeFocus=root.contains(document.activeElement)?document.activeElement?.dataset.focus:null;
  const scrollKey=el=>el.matches('[data-reading]')?'story-'+el.dataset.reading:'window-'+el.closest('[data-inspect-key]')?.dataset.inspectKey;
  const scrollNodes='[data-reading],.cj-inspect-scroll';
  if(!changed)for(const el of root.querySelectorAll(scrollNodes))scrollMemory.set(scrollKey(el),el.scrollTop);
  $('[data-header]').innerHTML=headerView(screen);
  $('[data-header]').hidden=['explore','collection'].includes(screen);
  if(screen!==lastScreen){child?.dispose();child=null;collection?.suspend();$('[data-main]').replaceChildren();if(screen==='explore')child=api.mountExploration($('[data-main]'),{session,display_data:d(),onScene:()=>{sceneRequested=true;render();},onWithdraw:()=>perform('withdraw'),onCommon:(kind,source,key)=>{rememberAnchor(source);panelTrail=[];panel=key?kind:panel===kind?null:kind;recordTab='targets';recordTarget=key||null;recordDetail=null;render();}});lastScreen=screen;}
  if(screen==='explore')child?.update(d(),state);
  else if(screen==='collection')mountCollection();
  else $('[data-main]').innerHTML=screen==='return'?returnView():screen==='hub'?hubView():screen==='scene'?sceneView():screen==='start'?startView():composeView();
  root.dataset.screen=screen;
  $('[data-bottom]').innerHTML=footerView(screen);
  const status=state.error?reason(state.error):state.pending?.kind==='write'?'反映中…':state.pending&&screen!=='explore'?'確認中…':message;
  $('[data-status]').innerHTML=(status?'<span>'+esc(status)+'</span>':'')+(state.canRetry?button('もう一度','retry'):'')+(state.stale?button('最新を読む','refresh'):'')+(status&&!state.pending?button(icon('x'),'dismiss-status','aria-label="通知を閉じる"'):'');
  $('[data-status]').hidden=!status;
  renderPanel();
  for(const el of root.querySelectorAll(scrollNodes)){const y=scrollMemory.get(scrollKey(el));if(y!=null)el.scrollTop=y;}
  if(beforeFocus){const target=[...root.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===beforeFocus);target?.focus({preventScroll:true});}
  root.setAttribute('aria-busy',String(!!state.pending||running));
  for(const b of root.querySelectorAll('[data-j-mutation]'))b.disabled=b.disabled||busy();
  if(typeof lucide!=='undefined')lucide.createIcons({attrs:{width:18,height:18}});
  queueMicrotask(layoutWindows);
  observeTexts();
 }
 function observeTexts(){
  observer?.disconnect();observer=null;
  const key=d().scene?.id+'|'+d().case?.attempts;
  if(key!==sceneKey){sceneKey=key;seen=new Set();visible=new Set();}
  if(typeof IntersectionObserver==='undefined')return;
  observer=new IntersectionObserver(entries=>{for(const en of entries)if(en.isIntersecting&&en.intersectionRatio>0&&!document.hidden)visible.add(en.target.dataset.jText);flushTexts();},{threshold:0.01});
  root.querySelectorAll('[data-j-text]').forEach(el=>observer.observe(el));
 }
 async function flushTexts(){
  if(recording||state.pending||state.canRetry||state.stale||running||disposed)return;
  const ids=[...visible].filter(id=>!seen.has(id));if(!ids.length||!session.can('record_displayed_text'))return;
  const key=sceneKey;recording=true;const result=await session.recordDisplayed(d().scene.id,ids);recording=false;
  if(result.ok&&key===sceneKey){ids.forEach(id=>seen.add(id));render();}
 }
 async function finishScene(){
  if(!d().scene?.paused)return true;
  const ids=[...visible];
  if(!ids.length){message='本文が表示されてから進めます';return false;}
  const recorded=await session.recordDisplayed(d().scene.id,ids);if(!recorded.ok)return false;
  const result=await session.execute('continue_scene',{scene_id:d().scene.id,advance:true,displayed_text_ids:[]});return result.ok;
 }
 async function toHome(){if(d().phase!=='return')return true;if(!await finishScene())return false;return (await session.ackReturn()).ok;}
 async function sequence(fn){if(busy())return;running=true;message='';render();try{await fn();}catch(e){message=reason(e);}finally{running=false;render();flushTexts();}}
 async function compareRestoredDraft(){if(!disposed&&d()?.phase==='home'&&dirty()&&!state.comparison&&!state.canRetry&&!state.stale)await session.compare();}
 async function exportData(){await sequence(async()=>{
  const document=await session.exportSave();api.downloadSave(document);message='保存を書き出しました';
 });}
 async function suspend(){if(!canSuspend())return;await sequence(async()=>{
  suspended=true;resetWindows();message='';
 });}
 async function navigate(destination){await sequence(async()=>{if(!await toHome())return;if(d().phase!=='home')return;if(destination==='hub')place='hub';else{place='compose';tab=destination;}panel=null;windows=[];message='';});}
 async function edit(fn){if(busy())return;const next=clone(p());fn(next);message='';committedFlash=false;if(session.setDraft(next))await session.compare();}
 async function perform(type,payload={}){await sequence(async()=>{const result=await session.execute(type,payload);if(result.ok){panel=null;windows=[];sceneRequested=false;}});}
 async function depart(){if(!destinationCanDepart())return;await sequence(async()=>{if(!await toHome())return;
   if(dirty()){const comparison=await session.compare();if(!comparison.ok){place='compose';return;}const result=await session.execute('commit_preparation',{plan:p()});if(!result.ok){continuation='depart';return;}message='編成を確定しました';}
   const result=await session.execute('depart',{case_id:d().case.id});if(result.ok){panel=null;windows=[];continuation=null;sceneRequested=false;}else continuation='depart';
  });}
 async function commit(){await sequence(async()=>{const result=await session.compare();if(!result.ok)return;const saved=await session.execute('commit_preparation',{plan:p()});if(saved.ok){panel=null;windows=[];committedFlash=true;message='編成を確定';}});}
 root.addEventListener('click',async event=>{
  const b=event.target.closest('[data-j]');if(!b){if(panel&&!event.target.closest('[data-inspector]')){panel=null;windows=[];render();}return;}if(!root.contains(b)||b.disabled)return;
  const action=b.dataset.j,id=b.dataset.id,base=info(id).base_id;
  if(unifiedAcquisition()&&['collection','deck','skills','offers','owned','review'].includes(action)){
   if(d().phase==='return')await navigate('hub');if(d().phase!=='home')return;
   place='collection';resetWindows();render();if(action==='skills')collection.setTab('passive');return;
  }
  if(action.startsWith('explore-')){const kind=action.slice(8);resetWindows();render();child?.openPanel(kind);return;}
  if(action==='select-destination'){if(busy()||d().phase!=='home'||!destinationOptions.some(x=>x.id===id))return;selectedDestinationId=id;resetWindows();message='';render();return;}
  if(['detail','menu','records','help','review','data','settings','receipt','destination','unavailable','notice','texts'].includes(action)&&!b.closest('[data-inspector]'))rememberAnchor(b);
  if(action==='menu-page'){menuPage=Math.max(0,menuPage+Number(b.dataset.step));render();return;}
  if(action==='page'){const items=catalogueItems(),layout=api.journeyLayout(frameWidth,items.length,pageAnchors[tab],0);pageAnchors[tab]=Math.max(0,Math.min(layout.pages-1,layout.page+Number(b.dataset.step)))*layout.capacity;panel=null;windows=windows.filter(w=>w.pinned);if(windows.length)panel='details';render();return;}
  if(action==='dismiss-status'){message='';if(state.error||state.canRetry||state.stale){panel='notice';renderPanel();layoutWindows();}$('[data-status]').hidden=true;return;}
  if(['deck','skills','offers','owned','hub'].includes(action)){if(d().phase==='return')await navigate(action);else if(d().phase==='home'){place=action==='hub'?'hub':'compose';if(action!=='hub')tab=action;panel=null;windows=windows.filter(w=>w.pinned);render();}return;}
  if(action==='detail'){enterPanel(b,'details');detailFromRecords=false;selected[info(id).kind==='passive'?'skills':'deck']=id;const same=windows.find(w=>w.id===id);if(same&&!same.pinned)windows=windows.filter(w=>w!==same);else if(!same){windows=windows.filter(w=>w.pinned);windows.push({id,pinned:false});}panel=windows.length?'details':null;render();return;}
  if(action==='window-back'){const level=Number(b.closest('[data-level]')?.dataset.level);if(Number.isInteger(level)&&level<panelTrail.length)panelTrail=panelTrail.slice(0,level);windowBack();return;}
  if(action==='close'){const level=Number(b.closest('[data-level]')?.dataset.level);if(Number.isInteger(level)&&level<panelTrail.length)panelTrail=panelTrail.slice(0,level);windowBack();return;}
  if(action==='pin'){const w=windows.find(w=>w.id===id);if(w)w.pinned=!w.pinned;render();return;}
  if(action==='close-item'){windows=windows.filter(w=>w.id!==id);if(!windows.length){windowBack();return;}render();return;}
  if(['menu','records','help','review','data','settings','receipt','destination','unavailable','notice','texts'].includes(action)){enterPanel(b,action);panel=panel===action?null:action;windows=[];recordDetail=null;recordTarget=null;render();return;}
  if(action==='record-tab'){recordTab=b.dataset.tab;recordTarget=null;recordDetail=null;render();return;}
  if(action==='record-target'){recordParentRect=paneRect(b);recordTarget=recordTarget===id?null:id;recordDetail=null;scrollMemory.delete('window-target:'+id);render();focusRecord();return;}
  if(action==='record-detail'){const entry=recordEntries.get(id);if(entry){recordParentRect=paneRect(b);recordDetail=recordDetail?.key===id?null:{...entry,key:id};scrollMemory.delete('window-record:'+id);render();focusRecord();}return;}
  if(action==='record-back'){const key=recordDetail?.key,targetId=recordTarget;if(b.closest('[data-inspect-key]')?.dataset.inspectKey.startsWith('target:')){recordDetail=null;recordTarget=null;}else if(recordDetail)recordDetail=null;else recordTarget=null;render();queueMicrotask(()=>{const action=recordTarget?'record-detail':recordTab==='cards'?'record-detail':'record-target';[...root.querySelectorAll('[data-j="'+action+'"]')].find(el=>el.dataset.id===(action==='record-target'?targetId:key))?.focus({preventScroll:true});});return;}
  if(action==='records-back'){panel='records';windows=[];render();return;}
  if(await economyAction(action,id,b))return;
    if(action==='add'||action==='remove'){await edit(next=>{const a=next.next_preparation.deck;if(action==='add')a.push(id);else{const at=a.indexOf(id);if(at>=0)a.splice(at,1);}});return;}
  if(action==='equip'||action==='learn'){await edit(next=>{if(!learned(base)){next.next_preparation.learn.push(base);}if(action==='equip'){const a=next.next_preparation.equipment;next.next_preparation.equipment=a.includes(id)?a.filter(x=>x!==id):[...a,id];}});return;}
  if(action==='forget'){await edit(next=>{if(next.next_preparation.learn.includes(base))next.next_preparation.learn=next.next_preparation.learn.filter(x=>x!==base);else{next.retain_learning=next.retain_learning.filter(x=>x!==base);next.cancel_learning.push(base);}next.next_preparation.equipment=next.next_preparation.equipment.filter(x=>info(x).base_id!==base);});return;}
  if(action==='restore-skill'){await edit(next=>{next.cancel_learning=next.cancel_learning.filter(x=>x!==base);next.retain_learning.push(base);});return;}
  if(action==='commit'){await commit();return;}if(action==='depart'){await depart();return;}
  if(action==='continue'){await sequence(async()=>{if(await finishScene()){sceneRequested=false;panel=null;windows=[];}});return;}
  if(action==='scene-back'){sceneRequested=false;render();return;}
  if(action==='retry'){if(state.pending)return;running=true;render();const result=await session.retry();running=false;const next=continuation;if(result.ok)continuation=null;if(result.ok&&next==='depart')await depart();else render();return;}
  if(action==='refresh'){windows=[];panel=null;purchaseChoice=null;conversionIds.clear();const fresh=await session.refresh({preserveLocal:false});if(fresh.ok)message='最新の状態を読み込みました。対象を選び直してください';render();return;}
  if(action==='discard'){await perform('discard_draft');return;}
  if(action==='suspend'){await suspend();return;}
  if(action==='resume'){if(!suspended||d()?.phase!=='exploring')return;await sequence(async()=>{const result=await session.refresh({preserveLocal:false});if(result.ok){suspended=false;panel=null;}});return;}
  if(action==='export'){await exportData();return;}
 },{signal:events.signal});
 root.addEventListener('change',event=>{if(event.target.matches('[data-compose-tab]')){const [dest,filter]=event.target.value.split(':');if(dest==='skills'){skillFilter=filter||'all';pageAnchors.skills=0;}root.querySelector('[data-j="'+dest+'"]')?.click();return;}if(event.target.matches('[data-skill-filter]')){skillFilter=event.target.value;pageAnchors.skills=0;render();return;}if(event.target.matches('[data-motion]'))root.dataset.motion=event.target.checked?'reduced':'normal';},{signal:events.signal});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel){panel=null;windows=[];render();}},{signal:events.signal});
 const off=session.subscribe(s=>{state=s;if(state.view)render();});
 document.fonts?.ready.then(()=>{if(!disposed)layoutWindows();});
 const ready=(state.view?Promise.resolve({ok:true}):session.refresh({preserveLocal:false})).then(async result=>{if(result.ok)await compareRestoredDraft();return result;});
 return {session,ready,get collection(){return collection;},state:()=>({tab,skillFilter,place,panel,panelTrail:clone(panelTrail),pageAnchors:clone(pageAnchors),recordTab,recordTarget,recordDetail:clone(recordDetail),windows:clone(windows),screen:currentScreen(),seen:[...seen],visible:[...visible]}),dispose(){disposed=true;observer?.disconnect();frameObserver.disconnect();off();events.abort();child?.dispose();collection?.dispose();session.dispose();displayFrame.dispose();}};
};
})(globalThis.CrossweaveUI);

(function(api){api.mountAcquisitionReview=function(node,fixture,settings={}){const acquisitionOptions={...settings,root:node,embedded:true};
const options=typeof acquisitionOptions==='undefined'?{}:acquisitionOptions;
const root=options.root||document.getElementById('cw-acquisition-review');
const eventScope=new AbortController();
const listen=(node,type,fn,extra={})=>node?.addEventListener(type,fn,{...extra,signal:eventScope.signal});
const screen=root.querySelector('[data-screen]'),overlay=root.querySelector('[data-overlay]'),live=root.querySelector('[data-live]');
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Public D03R adapter for the accepted acquisition component. No save/price owner.
const runtime=options.session||null;
let runtimeState=runtime?.state(),runtimeOff=null,runtimeToken=null;
function publicFixture(s){
 const h=s.view.display_data.home,details={...s.view.display_data.details,...s.draftDetails},catalogue={};
 for(const row of [...h.owned,...h.acquisition]){
  const detail=details[row.id];
  if(!detail)throw Error('acquisition_detail_missing');
  catalogue[row.blueprint.key]={key:row.blueprint.key,...clone(detail)};
 }
 return {rules:{deckSize:h.deck.required_size,perKindCap:h.deck.per_base_cap,equipmentLimit:h.equipment.capacity},
  initial:{wallet:h.economy.unspent_units/100,units:h.owned.map(x=>({uid:x.id,key:x.blueprint.key})),deck:h.deck.composition.flatMap(x=>Array(x.count).fill(x.id)),equipment:h.equipment.entries.map(x=>x.id),purchased:[]},
  catalogue,offers:h.acquisition.filter(x=>x.available&&x.available_quantity>0).map(x=>({id:x.id,key:x.blueprint.key,price:x.price_units/100,pending_uid:x.pending_selection_id,group:x.group_id,limit:x.group_limit})),groups:clone(h.acquisition_groups)};
}
if(runtime){fixture=publicFixture(runtimeState);runtimeToken=runtimeState.view.meta.view_token;}
function pendingUid(id){return runtime?offer(id)?.pending_uid:'pending-'+id;}
function pendingOffer(uid){return runtime?fixture.offers.find(x=>x.pending_uid===uid)?.id:String(uid).slice(8);}
function canStage(id){
 const o=offer(id);if(!o||draft.offers.includes(id)||current.purchased.includes(id))return false;
 return runtime?draft.offers.filter(x=>offer(x)?.group===o.group).length<o.limit:draft.offers.length+current.purchased.length<fixture.rules.offerLimit;
}
function runtimeLocked(){return !!runtime&&(runtimeState.view.display_data.phase!=='home'||runtimeState.stale||runtimeState.canRetry||['write','inspect'].includes(runtimeState.pending?.kind));}
function migrationPending(){return !!runtimeState?.draft?.migration_review;}
function runtimeReason(e){return globalThis.CrossweaveUI.saveFailureText?.(e)||({
 insufficient_unspent_funds:'着想が足りません。取得予定を見直してください。',
 invalid_deck_size:'札組を'+fixture.rules.deckSize+'枚にしてください。',deck_size:'札組を'+fixture.rules.deckSize+'枚にしてください。',
 deck_base_cap_exceeded:'同じ札の上限を超えています。',equipment_capacity_exceeded:'心得の枠が足りません。',
 duplicate_equipment_base:'同じ種類の心得は一つまで編成できます。',duplicate_equipment:'同じ心得を重ねて編成できません。',
 acquisition_group_limit:'同じ候補群の取得上限を超えています。',migration_review_required:'旧保存の変更案を確認してください。',
 stale_view:'状態が変わりました。読み直して選び直してください。',stale_revision:'状態が変わりました。読み直して選び直してください。',
 unknown_selection_handle:'選択が古くなりました。読み直して選び直してください。',preparation_contract_changed:'変更案の形式が変わりました。組み直してください。'
 })[e?.code]||'変更を確定できませんでした（'+(e?.code||'確認待ち')+'）。案は残っています。';}
function runtimeErrors(){
 if(runtimeState.pending)return ['確認中です。'];
 if(migrationPending())return ['旧保存の変更案は再確認が必要です。'];
 if(runtimeState.error)return [runtimeReason(runtimeState.error)];
 if(runtimeState.comparison?.refusal)return [runtimeReason(runtimeState.comparison.refusal)];
 return runtimeState.comparison?.ok?[]:dirty()?['変更内容を確認してください。']:[];
}
function runtimePlan(){return {schema:'CW-M1-preparation-2',acquire:[...draft.offers],composition:{deck:[...draft.deck],equipment:[...draft.equipment]},migration_review:runtimeState.draft.migration_review};}
function runtimeEdit(){if(runtime.setDraft(runtimePlan()))void runtime.compare();}
function runtimeReceive(s){
 runtimeState=s;
 // Home information is intentionally absent during exploration. The component is detached then.
 if(!s.view?.display_data.home){view.dialog=null;return;}
 // Never attach a new token to stale selection handles. Keep the visible draft until explicit reload.
 if(!s.stale&&s.view?.display_data.home){
  const changed=runtimeToken!==s.view.meta.view_token;
  fixture=publicFixture(s);current=clone(fixture.initial);
  if(s.draft?.schema==='CW-M1-preparation-2')draft={offers:[...s.draft.acquire],deck:[...s.draft.composition.deck],equipment:[...s.draft.composition.equipment]};
  if(changed){view.dialog=null;view.key=view.offer=view.uid=null;}
  runtimeToken=s.view.meta.view_token;
 }
 render();
}
async function runtimeAction(action){
 if(action==='retry'){if(!runtimeState.pending)await runtime.retry();return;}
 if(action==='reload'){if(!runtimeState.pending)await runtime.refresh({preserveLocal:false});return;}
 if(runtimeLocked())return;
 if(action==='rebuild'){
  const plan=globalThis.CrossweaveUI.currentPlan(runtimeState.view);
  if(runtime.setDraft(plan)){view.dialog=null;await runtime.compare();}return;
 }
 if(action==='discard'){
  if(runtimeState.view.display_data.draft.dirty||migrationPending())await runtime.execute('discard_draft');
  else {runtime.setDraft(globalThis.CrossweaveUI.currentPlan(runtimeState.view));view.dialog=null;render();}
  return;
 }
 if(action==='review'){
  view.dialog='review';render();await runtime.compare();return;
 }
 if(action==='commit'){
  if(runtimeErrors().length||!dirty())return;
  const result=await runtime.execute('commit_preparation',{plan:clone(runtimeState.draft)});
  if(result.ok)notify('取得と編成を保存しました。着想は'+current.wallet+'です。');
 }
}
function runtimeNotice(){
 if(!runtime)return '';
 if(migrationPending())return '<div class="cp-runtime-notice" role="status"><span>旧保存の変更案は再確認が必要です。確定済みの所持・編成は保持しています。</span>'+button('組み直す','rebuild')+button('戻す','discard')+'</div>';
 if(runtimeState.error||runtimeState.stale||runtimeState.canRetry)return '<div class="cp-runtime-notice" role="alert"><span>'+esc(runtimeReason(runtimeState.error))+'</span>'+(runtimeState.canRetry?button('再試行','retry'):'')+(runtimeState.stale?button('読み直す','reload',{label:'変更案を戻して最新の状態を読み直す'}):'')+'</div>';
 return '';
}
function runtimeTrack(){
 const group=fixture.groups.find(x=>x.id==='return-offer'),chosen=draft.offers.filter(id=>offer(id)?.group===group?.id).length;
 return '<div class="cp-purchase-track">'+icon(group?.status==='acquired'?'circle-check':'store')+'<span>'+(group?.status==='acquired'?'帰還分 取得済み':group?.status==='available'?'帰還分 '+chosen+' / '+group.limit:'帰還分 候補なし')+'</span>'+(draft.offers.length?'<span class="cp-pending-token">'+icon('clock-3')+draft.offers.length+'</span>':'')+'</div>';
}
function runtimeReviewBody(){
 const c=runtimeState.comparison,issues=runtimeErrors(),payment=c?.payment;
 const problems=issues.length?'<div role="alert" class="cp-problems">'+issues.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'';
 if(!c?.ok)return problems;
 const balance='<div class="cp-review-wallet">'+icon('lightbulb')+'<strong>'+payment.unspent_before_units/100+'</strong>'+icon('arrow-right')+'<strong>'+payment.unspent_after_units/100+'</strong><small>−'+payment.cost_units/100+'</small></div>';
 const purchases=draft.offers.map(id=>{const o=offer(id),zone=composed(pendingUid(id))?'build':'reserve';return '<div class="cp-change cp-review-purchase"><span class="cp-pending-token">'+icon('clock-3')+'</span><strong>'+esc(item(o.key).name)+'</strong>'+icon('arrow-right')+icon(zoneIcons[zone])+'<span>'+icon('lightbulb')+o.price+'</span></div>';}).join('');
 const changes=[...changesFor('deck'),...changesFor('equipment')];
 const diffs=changes.map(x=>'<div class="cp-change"><span>'+esc(item(x.key).name)+'</span><strong>'+x.before+' '+icon('arrow-right')+' '+x.after+'</strong></div>').join('');
 return problems+balance+(purchases?'<section class="cp-review-group"><h3>'+icon('store')+'取得</h3>'+purchases+'</section>':'')+(diffs?'<section class="cp-review-group"><h3>'+icon('layout-grid')+'編成</h3>'+diffs+'</section>':'')+'<div class="cp-capacity"><span>札</span><strong>'+c.prepared.deck.size+' / '+c.prepared.deck.required_size+'</strong><span>心得</span><strong>'+c.prepared.equipment.used+' / '+c.prepared.equipment.capacity+'</strong></div>'+changesFor('equipment').map(x=>'<details><summary>'+esc(item(x.key).name)+'</summary>'+facts(item(x.key))+'</details>').join('');
}

const item=key=>fixture.catalogue[key],offer=id=>fixture.offers.find(x=>x.id===id);
let current=clone(fixture.initial),draft=freshDraft(),view=emptyView(),lastFocus=null;
function freshDraft(){return {offers:[],deck:[...current.deck],equipment:[...current.equipment]};}
function projected(){return [...current.units,...draft.offers.map(id=>({uid:pendingUid(id),key:offer(id).key}))];}
function spending(){if(runtime)return runtimeState.comparison?.payment?.cost_units!=null?runtimeState.comparison.payment.cost_units/100:dirty()?'—':0;return draft.offers.reduce((sum,id)=>sum+offer(id).price,0);}
function selected(key,which=draft){const units=projected();return [...which.deck,...which.equipment].filter(uid=>units.find(x=>x.uid===uid)?.key===key).length;}
function owned(key){return current.units.filter(x=>x.key===key).length;}
function available(key){return projected().filter(x=>x.key===key).length;}
function pending(key){return draft.offers.find(id=>offer(id).key===key);}
function load(equipment=draft.equipment){if(runtime)return runtimeState.comparison?.prepared?.equipment.used??(dirty()?'—':runtimeState.view.display_data.home.equipment.used);return equipment.reduce((sum,uid)=>sum+(item(projected().find(x=>x.uid===uid)?.key)?.equipment_cost||0),0);}
function dirty(){if(runtime)return !!runtimeState.view.display_data.migration_notice?.review_required||!globalThis.CrossweaveUI.samePreparation(runtimeState.draft,globalThis.CrossweaveUI.currentPlan(runtimeState.view));return draft.offers.length>0||JSON.stringify(draft.deck)!==JSON.stringify(current.deck)||JSON.stringify(draft.equipment)!==JSON.stringify(current.equipment);}
function errors(){
 if(runtime)return runtimeErrors();
 const result=[],units=projected(),byUid=new Map(units.map(x=>[x.uid,x]));
 if(spending()>current.wallet)result.push('着想が'+(spending()-current.wallet)+'不足しています。');
 if(draft.offers.length+current.purchased.length>fixture.rules.offerLimit)result.push('今回の取得は'+fixture.rules.offerLimit+'点までです。');
 if(draft.deck.length!==fixture.rules.deckSize)result.push('札組を'+fixture.rules.deckSize+'枚にしてください（現在'+draft.deck.length+'枚）。');
 const counts={};for(const uid of draft.deck){const it=item(byUid.get(uid)?.key);if(!it){result.push('編成に含まれる札を確認してください。');continue;}counts[it.base_id]=(counts[it.base_id]||0)+1;}
 for(const [id,n] of Object.entries(counts))if(n>fixture.rules.perKindCap)result.push(item(units.find(x=>item(x.key).base_id===id).key).base_name+'は'+fixture.rules.perKindCap+'枚までです。');
 if(load()>fixture.rules.equipmentLimit)result.push('心得の枠が'+(load()-fixture.rules.equipmentLimit)+'超過しています。');
 for(const key of ['deck','equipment'])if(new Set(draft[key]).size!==draft[key].length||draft[key].some(uid=>!byUid.has(uid)))result.push('編成に使う所持品を確認してください。');
 return result;
}
function notify(text){live.textContent=text;}
function button(text,action,{key='',id='',uid='',zone='',disabled=false,primary=false,extra='',label=''}={}){
 return '<button type="button" class="cp-button cursor-interaction'+(primary?' cp-primary':'')+'" data-action="'+action+'"'+(key?' data-key="'+esc(key)+'"':'')+(id?' data-id="'+esc(id)+'"':'')+(uid?' data-uid="'+esc(uid)+'"':'')+(zone?' data-zone="'+esc(zone)+'"':'')+' data-focus="'+esc(action+'|'+(uid||key||id||zone))+'"'+(disabled?' disabled':'')+(label?' aria-label="'+esc(label)+'"':'')+' '+extra+'>'+text+'</button>';
}
function stateText(key){return (owned(key)?'所持 '+owned(key):'未所持')+(pending(key)?' → '+available(key):'')+' · 編成 '+selected(key);}
const zones=['offer','reserve','build'];
const zoneNames={offer:'取得可能',reserve:'所持',build:'編成'};
const zoneIcons={offer:'store',reserve:'layers',build:'layout-grid'};
function emptyView(){return {tab:'card',scroll:{},boardLeft:0,reveal:null,dialog:null,key:null,offer:null,uid:null,zone:null};}
function icon(name){return '<i data-lucide="'+name+'" aria-hidden="true"></i>';}
function unitPending(uid){return runtime?fixture.offers.some(x=>x.pending_uid===uid):String(uid||'').startsWith('pending-');}
function composed(uid){return draft.deck.includes(uid)||draft.equipment.includes(uid);}
function offerPhase(){if(runtime)return fixture.offers.some(o=>item(o.key).kind===view.tab)?'open':fixture.groups.some(g=>g.status==='acquired')?'complete':'empty';return current.purchased.length>0&&current.purchased.length>=fixture.rules.offerLimit?'complete':fixture.offers.length?'open':'empty';}
function motionId(row){return row.offer?'offer-'+row.offer.id:unitPending(row.uid)?'offer-'+pendingOffer(row.uid):row.uid?.startsWith('acquired-')?'offer-'+row.uid.slice(9):row.uid;}
function rowsFor(zone){
 if(zone==='offer')return offerPhase()==='complete'?[]:fixture.offers.filter(o=>item(o.key).kind===view.tab&&!current.purchased.includes(o.id)).map(o=>({key:o.key,offer:o,placeholder:draft.offers.includes(o.id)}));
 const units=projected().filter(x=>item(x.key).kind===view.tab);
 if(zone==='build')return (view.tab==='card'?draft.deck:draft.equipment).map(uid=>({...units.find(x=>x.uid===uid),count:1}));
 const groups=new Map();for(const unit of units.filter(x=>!composed(x.uid))){const id=unit.key+'|'+unitPending(unit.uid);if(!groups.has(id))groups.set(id,{...unit,count:0});groups.get(id).count++;}return [...groups.values()];
}
function dimensions(){
 const columnsByZone={offer:1,reserve:2,build:2},laneWidths={offer:376,reserve:735,build:735};
 return {width:1920,height:1080,tileWidth:352,tileHeight:80,gap:8,orientation:'columns',columnsByZone,laneWidths,
  gridHeights:{offer:878,reserve:878,build:878},capacity:{offer:10,reserve:20,build:20},
  boardStyle:'grid-template-columns:'+zones.map(z=>laneWidths[z]+'px').join(' ')};
}
function revealUnit(zone,uid,key,id){view.reveal={zone,uid,key,id};}
function saveScroll(){
 for(const el of screen.querySelectorAll('[data-scroll-zone]'))view.scroll[el.dataset.kind+':'+el.dataset.scrollZone]={left:el.scrollLeft,top:el.scrollTop};
 const board=screen.querySelector('[data-board-scroll]');if(board)view.boardLeft=board.scrollLeft;
}
function restoreScroll(){
 const d=dimensions(),board=screen.querySelector('[data-board-scroll]');if(board)board.scrollLeft=view.boardLeft;
 for(const el of screen.querySelectorAll('[data-scroll-zone]')){const saved=view.scroll[view.tab+':'+el.dataset.scrollZone];if(saved){el.scrollLeft=saved.left;el.scrollTop=saved.top;}}
 if(!view.reveal)return;
 const {zone,uid,key,id}=view.reveal,rows=rowsFor(zone),index=rows.findIndex(row=>zone==='offer'?row.offer.id===id:row.uid===uid||(zone==='reserve'&&row.key===key&&unitPending(row.uid)===unitPending(uid)));
 view.reveal=null;if(index<0)return;
 const columns=d.columnsByZone[zone],el=screen.querySelector('[data-scroll-zone="'+zone+'"]'),left=2+(index%columns)*(d.tileWidth+d.gap),top=2+Math.floor(index/columns)*(d.tileHeight+d.gap),w=el.clientWidth||d.laneWidths[zone]-16,h=el.clientHeight||d.gridHeights[zone];
 if(left<el.scrollLeft)el.scrollLeft=left-2;else if(left+d.tileWidth>el.scrollLeft+w)el.scrollLeft=left+d.tileWidth-w+2;
 if(top<el.scrollTop)el.scrollTop=top-2;else if(top+d.tileHeight>el.scrollTop+h)el.scrollTop=top+d.tileHeight-h+2;
 const lane=el.closest('[data-zone]'),lr=lane.getBoundingClientRect(),br=board.getBoundingClientRect();
 if(lr.left<br.left)board.scrollLeft-=(br.left-lr.left)/previewScale();else if(lr.right>br.right)board.scrollLeft+=(lr.right-br.right)/previewScale();
 saveScroll();
}
function localAction(row,zone,{compact=false}={}){
 const key=row.key,uid=row.uid;
 if(zone==='offer')return button('取得','stage',{id:row.offer.id,primary:true,disabled:!canStage(row.offer.id),label:item(key).name+'を未払いで取得する'});
 const put=zone==='reserve';
 return button(put?'編成':'外す',put?'add':'remove',{key,uid,primary:put,label:item(key).name+'を編成'+(put?'に入れる':'から外す')})+(unitPending(uid)&&!compact?button('取消','unstage',{id:pendingOffer(uid),label:item(key).name+'の取得をやめる'}):'');
}
function card(row,zone){
 if(row.placeholder)return '<div class="cp-offer-empty" aria-label="'+esc(item(row.key).name)+'は取得予定へ移動済み">'+icon('arrow-right')+'</div>';
 const it=item(row.key),p=unitPending(row.uid),o=row.offer,price=o?.price??(p?offer(pendingOffer(row.uid)).price:null);
 const state=zone==='offer'?'取得可能':(p?'取得予定、未払い':'所持')+(zone==='build'?'、編成中':'、未編成');
 return '<article class="cp-piece cp-'+zone+(p?' cp-pending':'')+'" data-zone-item="'+zone+'" data-unit="'+esc(row.uid||'')+'" data-key="'+esc(row.key)+'" data-offer="'+esc(o?.id||'')+'" data-motion="'+esc(motionId(row))+'" data-pending="'+p+'" aria-label="'+esc(it.name+'、'+state)+'">'+
  button('<strong>'+esc(it.name)+'</strong><span class="cp-card-meta"><span class="cp-card-mark">'+icon(zone==='build'?'check':it.kind==='card'?'layers':'scroll-text')+'</span>'+(price!==null?icon('lightbulb')+'<span>'+price+'</span>':it.kind==='passive'?icon('grid-2x2')+'<span>'+it.equipment_cost+'</span>':'<span>'+esc(it.attribute||'')+'</span>')+(row.count>1?'<span class="cp-quantity">×'+row.count+'</span>':'')+'</span>'+(p?'<span class="cp-clock" data-tooltip="支払前">'+icon('clock-3')+'</span>':''),'detail',{key:row.key,id:o?.id,uid:row.uid,zone,label:it.name+'の詳細、'+state,extra:'data-tooltip="'+esc(it.name)+'"'})+
  '<div class="cp-item-actions">'+localAction(row,zone,{compact:true})+'</div></article>';
}
function lane(zone){
 const all=rowsFor(zone),d=dimensions();
 const count=zone==='build'?(view.tab==='card'?draft.deck.length+' / '+fixture.rules.deckSize:load()+' / '+fixture.rules.equipmentLimit):zone==='reserve'?all.reduce((n,x)=>n+x.count,0):all.filter(x=>!x.placeholder).length;
 const capacityBad=zone==='build'&&(view.tab==='card'?draft.deck.length!==fixture.rules.deckSize:load()>fixture.rules.equipmentLimit);
 const title=icon(zoneIcons[zone])+'<span>'+zoneNames[zone]+'</span><strong class="'+(capacityBad?'cp-warning':'')+'">'+count+'</strong>';
 let cells=all.map(row=>card(row,zone)).join('');
 if(zone==='build'&&view.tab==='card'&&all.length<fixture.rules.deckSize)cells+=Array.from({length:fixture.rules.deckSize-all.length},()=>'<div class="cp-empty cp-slot" aria-label="空き枠">'+icon('plus')+'</div>').join('');
 if(!cells)cells=zone==='offer'?'<p class="cp-offer-message" data-offer-state="'+offerPhase()+'" role="status">'+icon(offerPhase()==='complete'?'circle-check':'inbox')+'<span>'+(offerPhase()==='complete'?'今回の取得は完了':'取得できる'+(view.tab==='card'?'札':'心得')+'はありません')+'</span></p>':'<div class="cp-empty" aria-label="'+zoneNames[zone]+'は空です">'+icon(zone==='build'?'square-dashed':zoneIcons[zone])+'</div>';
 return '<section class="cp-lane cp-lane-'+zone+'" data-zone="'+zone+'" aria-label="'+zoneNames[zone]+'"><header class="cp-lane-head"><div class="cp-lane-title">'+title+'</div><span class="cp-drop-label" aria-hidden="true"></span></header><div class="cp-lane-grid" data-scroll-zone="'+zone+'" data-kind="'+view.tab+'" style="--cp-columns:'+d.columnsByZone[zone]+'">'+cells+'</div></section>';
}
function wallet(){if(runtime){const after=runtimeState.comparison?.payment?.unspent_after_units;return '<div class="cp-wallet" aria-label="着想">'+icon('lightbulb')+'<span>着想</span><strong>'+current.wallet+'</strong>'+(dirty()?icon('arrow-right')+'<span class="cp-wallet-next">'+icon('clock-3')+'<strong>'+(after==null?'—':after/100)+'</strong></span>':'')+'</div>';}return '<div class="cp-wallet" aria-label="着想 現在'+current.wallet+'、支払予定'+spending()+'、確定後'+(current.wallet-spending())+'">'+icon('lightbulb')+'<span>着想</span><strong>'+current.wallet+'</strong>'+(dirty()?icon('arrow-right')+'<span class="cp-wallet-next '+(spending()>current.wallet?'cp-warning':'')+'" data-tooltip="支払後">'+icon('clock-3')+'<strong>'+(current.wallet-spending())+'</strong></span>':'')+'</div>';}
function purchaseTrack(){
 if(runtime)return runtimeTrack();
 const phase=offerPhase();
 if(phase==='complete')return '<div class="cp-purchase-track">'+icon('circle-check')+'<span>取得済み '+current.purchased.length+' / '+fixture.rules.offerLimit+'</span></div>';
 if(phase==='empty')return '<div class="cp-purchase-track">'+icon('inbox')+'<span>取得候補なし</span></div>';
 return '<div class="cp-purchase-track" aria-label="今回の取得、選択済み'+(draft.offers.length+current.purchased.length)+'点、上限'+fixture.rules.offerLimit+'点">'+icon('store')+'<span>'+(draft.offers.length+current.purchased.length)+' / '+fixture.rules.offerLimit+'</span>'+(draft.offers.length?icon('arrow-right')+draft.offers.map(id=>'<span class="cp-pending-token" data-tooltip="'+esc(item(offer(id).key).name)+'">'+icon(item(offer(id).key).kind==='card'?'layers':'scroll-text')+icon('clock-3')+'</span>').join(''):'')+'</div>';
}
function render(preserveScroll=true){
 cancelGesture();if(preserveScroll)saveScroll();
 const focus=document.activeElement?.dataset.focus,hadFocus=root.contains(document.activeElement),scroll=overlay.querySelector('.cp-dialog-scroll')?.scrollTop||0;
 const oldPositions=new Map([...screen.querySelectorAll('[data-motion]')].map(x=>[x.dataset.motion,x.getBoundingClientRect()]));
 screen.innerHTML='<header class="cp-header"><span class="cp-brand">crossweave</span><nav aria-label="管理するもの">'+[['card','札'],['passive','心得']].map(([id,label])=>button(label,'tab',{id,extra:'aria-pressed="'+(view.tab===id)+'"'})).join('')+'</nav>'+wallet()+'</header><main class="cp-main" data-board-scroll data-orientation="'+dimensions().orientation+'" style="'+dimensions().boardStyle+'">'+zones.map(lane).join('')+'</main><footer class="cp-footer">'+purchaseTrack()+button(icon('undo-2')+'戻す','discard',{disabled:!dirty(),label:'取得予定と編成の変更をすべて戻す'})+button('確認する','review',{primary:true,disabled:!dirty()})+'</footer>';
 if(options.embedded){
  const header=screen.querySelector('.cp-header');
  header.querySelector('.cp-brand').outerHTML=button(icon('arrow-left')+'戻る','back',{label:'探索先に戻る'});
  header.insertAdjacentHTML('beforeend',globalThis.CrossweaveUI.commonNavigationHTML());
 }
 screen.insertAdjacentHTML('afterbegin',runtimeNotice());
 restoreScroll();renderDialog();
 if(runtime){for(const b of root.querySelectorAll('button[data-action]')){const a=b.dataset.action;if(runtimeLocked()&&!['tab','detail','close','back','retry','reload'].includes(a)||migrationPending()&&!['tab','detail','close','back','discard','rebuild'].includes(a)||runtimeState.pending&&['commit','review','retry','reload'].includes(a))b.disabled=true;}}
 const target=[...root.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===focus&&!x.disabled&&(view.dialog?overlay.contains(x):screen.contains(x)));
 if(target)target.focus({preventScroll:true});else if(view.dialog)overlay.querySelector('[data-action="close"]')?.focus({preventScroll:true});else if(hadFocus)screen.querySelector('[data-action="tab"][aria-pressed="true"]')?.focus({preventScroll:true});
 if(overlay.querySelector('.cp-dialog-scroll'))overlay.querySelector('.cp-dialog-scroll').scrollTop=scroll;
 if(globalThis.lucide)globalThis.lucide.createIcons({attrs:{width:16,height:16}});
 if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)for(const el of screen.querySelectorAll('[data-motion]')){const before=oldPositions.get(el.dataset.motion);if(!before||!el.animate)continue;const after=el.getBoundingClientRect();const dx=(before.x-after.x)/previewScale(),dy=(before.y-after.y)/previewScale();if(dx||dy)el.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:200,easing:'ease-out'});}
 options.onChange?.({modified:dirty()||(!runtime&&JSON.stringify(current)!==JSON.stringify(fixture.initial)),wallet:current.wallet,pending:spending()});
}
function facts(it){
 const row=(label,value)=>'<div><dt>'+label+'</dt><dd>'+esc(value)+'</dd></div>';
 if(it.kind==='passive')return '<dl class="cp-facts">'+row('枠消費',it.equipment_cost)+row('発動条件',it.trigger_text.replaceAll('／','。'))+row('効果',it.effect_text.replaceAll('／','。'))+'</dl>';
 const p=it.primary;if(p?.kind==='defense_support')return '<dl class="cp-facts">'+row('全員へ身構',p.defense_grant.guard)+row('全員へ攪乱',p.defense_grant.evasion)+row('手札期限',it.life)+'</dl>';return '<dl class="cp-facts">'+(it.attribute?row('属性',it.attribute):'')+row(p.kind==='guard'?'身構':p.kind==='heal'?'回復':'突破',p.power)+(p.kind==='guard'?row('攪乱',p.evasion):p.kind==='attack'?row('探査',p.hit):'')+row('手札期限',it.life)+row('行動間隔','置く '+it.action_intervals.place+' / 一致 '+it.action_intervals.match)+row('場の効果','突破／身構 '+it.field.power+'、探査／攪乱 '+it.field.hit)+(it.recovery_rule==='consumed_on_recovery'?row('性質','この探索では回収時に消滅。所持品は残る。'):'')+'</dl>';
}
function changesFor(field){const keys=[...new Set([...current[field],...draft[field]].map(uid=>projected().find(x=>x.uid===uid)?.key))];return keys.map(key=>({key,before:current[field].filter(uid=>current.units.find(x=>x.uid===uid)?.key===key).length,after:draft[field].filter(uid=>projected().find(x=>x.uid===uid)?.key===key).length})).filter(x=>x.before!==x.after);}
function reviewBody(){
 if(runtime)return runtimeReviewBody();
 const issues=errors(),changed=[...changesFor('deck'),...changesFor('equipment')];
 const balance='<div class="cp-review-wallet">'+icon('lightbulb')+'<strong>'+current.wallet+'</strong>'+icon('arrow-right')+'<strong>'+(current.wallet-spending())+'</strong><small>−'+spending()+'</small></div>';
 const purchases=draft.offers.map(id=>{const o=offer(id),zone=composed(pendingUid(id))?'build':'reserve';return '<div class="cp-change cp-review-purchase" aria-label="'+esc(item(o.key).name)+'を取得し、'+(zone==='build'?'編成する':'編成せず所持する')+'"><span class="cp-pending-token">'+icon('clock-3')+'</span><strong>'+esc(item(o.key).name)+'</strong>'+icon('arrow-right')+icon(zoneIcons[zone])+'<span>'+icon('lightbulb')+o.price+'</span></div>';}).join('');
 const diffs=changed.map(x=>'<div class="cp-change"><span>'+esc(item(x.key).name)+'</span><strong>'+x.before+' '+icon('arrow-right')+' '+x.after+'</strong></div>').join('');
 const effects=changesFor('equipment').map(x=>'<details><summary>'+esc(item(x.key).name)+'</summary>'+facts(item(x.key))+'</details>').join('');
 return (issues.length?'<div role="alert" class="cp-problems">'+issues.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'')+balance+(purchases?'<section class="cp-review-group"><h3>'+icon('store')+'取得</h3>'+purchases+'</section>':'')+(diffs?'<section class="cp-review-group"><h3>'+icon('layout-grid')+'編成</h3>'+diffs+'</section>':'')+'<div class="cp-capacity"><span>'+icon('layers')+'札</span><strong>'+draft.deck.length+' / '+fixture.rules.deckSize+'</strong><span>'+icon('grid-2x2')+'心得</span><strong>'+load()+' / '+fixture.rules.equipmentLimit+'</strong></div>'+effects;
}
function renderDialog(){
 overlay.hidden=!view.dialog;screen.inert=!!view.dialog;const reset=root.querySelector('[data-action="reset"]');if(reset)reset.disabled=!!view.dialog;if(!view.dialog){overlay.replaceChildren();return;}
 let title,body,actions;
 if(view.dialog==='detail'){
  const key=view.key,it=item(key);let unit=projected().find(x=>x.uid===view.uid);
  if(!unit&&pending(key))unit=projected().find(x=>x.uid===pendingUid(pending(key)));
  if(!unit&&owned(key)&&!view.offer)unit=projected().find(x=>x.key===key);
  const o=view.offer?offer(view.offer):pending(key)?offer(pending(key)):null,zone=unit?(composed(unit.uid)?'build':'reserve'):'offer';
  const p=unit&&unitPending(unit.uid),path=zones.map(z=>'<span class="'+(z===zone?'is-active':'')+'" aria-label="'+zoneNames[z]+'">'+icon(zoneIcons[z])+'</span>').join(icon('chevron-right'));
  title=it.name;body='<div class="cp-location">'+path+(p?'<span class="cp-pending-token" aria-label="未払い">'+icon('clock-3')+'</span>':'')+'</div>'+facts(it)+(it.affixes.length?'<details><summary>修飾</summary>'+it.affixes.map(x=>'<p>'+esc(x.label)+'：'+esc(x.description.replaceAll('／','。'))+'</p>').join('')+'</details>':'');
  if(o&&(zone==='offer'||p))body+='<div class="cp-price">'+icon('lightbulb')+'<strong>'+o.price+'</strong></div>';
  actions=unit?localAction({...unit,count:1},zone):o?localAction({key,offer:o},'offer'):'';
 }else{title='変更内容';body=reviewBody();actions='<span class="cp-payment">'+icon('lightbulb')+'<strong>'+spending()+'</strong></span>'+button('確定する','commit',{primary:true,disabled:errors().length>0||!dirty(),label:'表示中の取得と編成を確定する'});}
 if(runtime&&view.dialog==='review'&&(runtimeState.canRetry||runtimeState.stale))actions=(runtimeState.canRetry?button('再試行','retry',{primary:true}):'')+(runtimeState.stale?button('読み直す','reload',{primary:true,label:'変更案を戻して最新の状態を読み直す'}):'');
 overlay.innerHTML='<section class="cp-dialog" role="dialog" aria-modal="true" aria-labelledby="cp-dialog-title"><header class="cp-dialog-head"><h2 id="cp-dialog-title">'+esc(title)+'</h2>'+button(icon('x'),'close',{label:'閉じる'})+'</header><div class="cp-dialog-scroll">'+body+'</div><footer class="cp-dialog-actions">'+actions+'</footer></section>';
}
function openDialog(type,key,id,uid,zone){lastFocus=document.activeElement?.dataset.focus;view.dialog=type;view.key=key;view.offer=id||null;view.uid=uid||null;view.zone=zone||null;render();overlay.querySelector('[data-action="close"]').focus({preventScroll:true});}
function closeDialog(){view.dialog=null;render();if(!view.dialog)[...screen.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===lastFocus&&!x.disabled)?.focus({preventScroll:true});}

// The game remains 1920x1080. Only this surrounding review viewport scales it.
const previewState={mode:'fit',scale:1};
function previewScale(){return options.embedded?(globalThis.CrossweaveUI.displayScale(root)||1):previewState.scale;}
function syncPreview(){
 cancelGesture();
 if(options.embedded)return;
 const viewport=root.querySelector('[data-preview-window]'),space=root.querySelector('[data-preview-space]');
 const width=viewport.clientWidth||root.getBoundingClientRect().width||1024;
 const scale=previewState.mode==='actual'?1:Math.min(1,width/1920);
 previewState.scale=scale;
 root.style.setProperty('--cp-preview-scale',String(scale));
 space.style.width=(1920*scale)+'px';space.style.height=(1080*scale)+'px';
 viewport.style.height=(previewState.mode==='actual'?Math.min(720,Math.max(440,width*.7)):1080*scale)+'px';
 root.querySelector('[data-preview-scale]').textContent=Math.round(scale*100)+'%'+(scale<1?' · 縮小':' · 1:1');
 for(const b of root.querySelectorAll('[data-preview]'))b.setAttribute('aria-pressed',String(b.dataset.preview===previewState.mode));
 if(previewState.mode==='fit'){viewport.scrollLeft=0;viewport.scrollTop=0;}
}
listen(root.querySelector('.cp-reviewbar'),'click',e=>{
 const b=e.target.closest('button[data-preview]');if(!b)return;
 previewState.mode=b.dataset.preview;syncPreview();
});

function mutate(action,key,id,uid,destination='reserve'){
 if(runtime&&['commit','discard','rebuild','retry','reload'].includes(action)){void runtimeAction(action);return;}
 if(runtimeLocked()||migrationPending())return;
 if(action==='stage'){
  if(!canStage(id))return;
  draft.offers.push(id);if(destination==='build')draft[item(offer(id).key).kind==='card'?'deck':'equipment'].push(pendingUid(id));revealUnit(destination,pendingUid(id),offer(id).key);notify(item(offer(id).key).name+'を取得予定に追加しました。'+(destination==='build'?'編成しました。':'')+'着想はまだ支払っていません。');
 }else if(action==='unstage'){
  if(!draft.offers.includes(id))return;
  draft.offers=draft.offers.filter(x=>x!==id);for(const type of ['deck','equipment'])draft[type]=draft[type].filter(uid=>uid!==pendingUid(id));
  if(view.dialog==='detail'&&view.key===offer(id).key){view.uid=null;view.offer=id;}
  revealUnit('offer',null,null,id);
  notify('取得予定を取り消しました。その予定分の編成も外しました。着想は変わりません。');
 }else if(action==='add'||action==='remove'){
  if(!item(key))return;const field=item(key).kind==='card'?'deck':'equipment';
  if(action==='add'){const unit=projected().find(x=>x.key===key&&!draft[field].includes(x.uid)&&(!uid||x.uid===uid));if(!unit)return;draft[field].push(unit.uid);revealUnit('build',unit.uid,key);}
  else{const target=uid&&draft[field].includes(uid)?uid:draft[field].findLast(u=>projected().find(x=>x.uid===u)?.key===key);if(!target)return;draft[field]=draft[field].filter(x=>x!==target);revealUnit('reserve',target,key);}
  notify(item(key).name+'を編成'+(action==='add'?'に入れました。':'から外しました。')+(pending(key)?'取得予定と支払予定額は変わりません。':'所持品はそのままです。'));
 }else if(action==='discard'){draft=freshDraft();view.dialog=null;notify('取得予定と編成の変更をすべて取り消しました。最後に確定した状態です。');}
 else if(action==='commit'){
  const issues=errors();if(issues.length||!dirty()){notify(issues[0]||'変更はありません。');return;}
  const cost=spending(),mapping=Object.fromEntries(draft.offers.map(id=>[pendingUid(id),'acquired-'+id]));
  const next={wallet:current.wallet-cost,units:[...clone(current.units),...draft.offers.map(id=>({uid:mapping[pendingUid(id)],key:offer(id).key}))],purchased:[...current.purchased,...draft.offers],deck:draft.deck.map(uid=>mapping[uid]||uid),equipment:draft.equipment.map(uid=>mapping[uid]||uid)};
  current=next;draft=freshDraft();view.dialog=null;notify((cost?'着想'+cost+'を支払い、正式に取得しました。':'')+'編成を確定しました。現在の着想は'+current.wallet+'です。');
 }
 if(runtime)runtimeEdit();else render();
}
// Same gesture split as exploration: short hold moves a piece; immediate swipe pans.
let gesture=null,suppressUntil=0;
const holdMs=220,moveThreshold=8;
const holdCue=globalThis.CrossweaveHoldCue.mount(root.querySelector('.cp-shell'),{scale:previewScale});
function dropPlan(data,to){
 if(!to||to===data.from||runtimeLocked()||migrationPending())return null;
 if(data.from==='offer'){
  if(!canStage(data.id)||runtimeLocked()||migrationPending())return null;
  return ['reserve','build'].includes(to)?{action:'stage',label:to==='build'?'取得・編成':'取得',destination:to}:null;
 }
 const unit=projected().find(x=>x.uid===data.uid);
 if(!unit||unit.key!==data.key||(composed(data.uid)?'build':'reserve')!==data.from)return null;
 if(to==='offer')return unitPending(data.uid)?{action:'unstage',label:'取消',id:pendingOffer(data.uid)}:null;
 if(to==='build'&&data.from==='reserve')return {action:'add',label:'編成'};
 if(to==='reserve'&&data.from==='build')return {action:'remove',label:'外す'};
 return null;
}
function hitLane(x,y){const el=document.elementFromPoint?.(x,y),lane=el?.closest?.('section[data-zone]');return lane&&screen.contains(lane)?lane:null;}
function clearDropMarks(){for(const lane of screen.querySelectorAll('section[data-zone]')){delete lane.dataset.drop;lane.querySelector('.cp-drop-label').textContent='';}}
function paintDrop(d){
 clearDropMarks();const lane=hitLane(d.lastX,d.lastY);if(!lane)return;
 const plan=dropPlan(d,lane.dataset.zone);lane.dataset.drop=plan?'allowed':'blocked';
 lane.querySelector('.cp-drop-label').textContent=plan?.label||'';
 d.ghost?.classList.toggle('cp-no-drop',!plan);
}
function positionGhost(d){
 const shell=root.querySelector('.cp-shell'),r=shell.getBoundingClientRect();
 d.ghost.style.left=((d.lastX-r.left-d.offsetX)/previewScale()-shell.clientLeft)+'px';d.ghost.style.top=((d.lastY-r.top-d.offsetY)/previewScale()-shell.clientTop)+'px';
}
function scrollAtEdge(el,x,y,horizontal=true,vertical=true){
 if(!el)return;const r=el.getBoundingClientRect(),edge=22;
 if(x<r.left||x>r.right||y<r.top||y>r.bottom)return;
 if(horizontal&&el.scrollWidth>el.clientWidth){if(x<r.left+edge)el.scrollLeft-=7;else if(x>r.right-edge)el.scrollLeft+=7;}
 if(vertical&&el.scrollHeight>el.clientHeight){if(y<r.top+edge)el.scrollTop-=7;else if(y>r.bottom-edge)el.scrollTop+=7;}
}
function dragFrame(){
 const d=gesture;if(!d?.held)return;
 const lane=hitLane(d.lastX,d.lastY);scrollAtEdge(lane?.querySelector('[data-scroll-zone]'),d.lastX,d.lastY);
 scrollAtEdge(screen.querySelector('[data-board-scroll]'),d.lastX,d.lastY,true,false);
 paintDrop(d);d.frame=requestAnimationFrame(dragFrame);
}
function capturePointer(d){try{root.setPointerCapture?.(d.pointer);}catch{}}
function startHeld(d){
 if(gesture!==d||d.panning||view.dialog||!d.piece.isConnected)return;
 holdCue.cancel();d.held=true;capturePointer(d);d.piece.classList.add('cp-lifted');
 const ghost=d.piece.cloneNode(true);ghost.classList.remove('cp-lifted');ghost.classList.add('cp-drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
 for(const el of [ghost,...ghost.querySelectorAll('*')])for(const key of Object.keys(el.dataset))delete el.dataset[key];
 root.querySelector('.cp-shell').append(ghost);d.ghost=ghost;
 root.dataset.dragging='true';positionGhost(d);paintDrop(d);d.frame=requestAnimationFrame(dragFrame);
 notify(item(d.key).name+'を移動中です。');
}
function cancelGesture(suppress=true){
 holdCue.cancel();const d=gesture;if(!d)return;gesture=null;clearTimeout(d.timer);if(d.frame)cancelAnimationFrame(d.frame);
 d.ghost?.remove();d.piece?.classList.remove('cp-lifted');delete root.dataset.dragging;delete root.dataset.panning;clearDropMarks();
 if(root.hasPointerCapture?.(d.pointer))root.releasePointerCapture(d.pointer);
 if(suppress)suppressUntil=Date.now()+400;saveScroll();
}
listen(root,'pointerdown',e=>{
 if(e.isPrimary===false){cancelGesture();return;}
 if(e.button!==0||gesture||view.dialog||runtimeLocked()||migrationPending())return;
 const piece=e.target.closest('.cp-piece'),buttonTarget=e.target.closest('button');
 if(buttonTarget&&buttonTarget.dataset.action!=='detail')return;
 const pan=piece?.closest('[data-scroll-zone]')||e.target.closest('[data-scroll-zone]')||e.target.closest('[data-board-scroll]');if(!pan)return;
 suppressUntil=0;
 const r=piece?.getBoundingClientRect(),d=gesture={pointer:e.pointerId,piece,pan,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,scrollX:pan.scrollLeft,scrollY:pan.scrollTop,held:false,panning:false,from:piece?.dataset.zoneItem,key:piece?.dataset.key,uid:piece?.dataset.unit,id:piece?.dataset.offer,offsetX:r?e.clientX-r.left:0,offsetY:r?e.clientY-r.top:0};
 if(piece){d.timer=setTimeout(()=>startHeld(d),holdMs);holdCue.start(e,holdMs,'drag');}
});
listen(root,'pointermove',e=>{
 const d=gesture;if(!d||d.pointer!==e.pointerId)return;holdCue.move(e);d.lastX=e.clientX;d.lastY=e.clientY;
 const dx=e.clientX-d.x,dy=e.clientY-d.y;
 if(d.held){e.preventDefault();positionGhost(d);paintDrop(d);return;}
 if(d.panning||Math.hypot(dx,dy)>moveThreshold){
  clearTimeout(d.timer);holdCue.cancel();d.panning=true;root.dataset.panning='true';capturePointer(d);
  d.pan.scrollLeft=d.scrollX-dx/previewScale();d.pan.scrollTop=d.scrollY-dy/previewScale();e.preventDefault();
 }
},{passive:false});
listen(root,'pointerup',e=>{
 const d=gesture;if(!d||d.pointer!==e.pointerId)return;
 const lane=hitLane(e.clientX,e.clientY),plan=d.held?dropPlan(d,lane?.dataset.zone):null,active=d.held||d.panning;
 cancelGesture(active);
 if(plan)mutate(plan.action,d.key,plan.id||d.id,d.uid,plan.destination);
 else if(d.held)notify('移動を取り消しました。');
});
for(const type of ['pointercancel','lostpointercapture'])listen(root,type,e=>{if(gesture?.pointer===e.pointerId)cancelGesture();});
listen(root,'pointerleave',()=>{if(gesture&&!gesture.held&&!gesture.panning)cancelGesture();});
listen(root,'contextmenu',e=>{if(gesture)e.preventDefault();});
listen(root,'wheel',e=>{
 cancelGesture();const grid=e.target.closest('[data-scroll-zone]')||e.target.closest('[data-board-scroll]');if(!grid||e.ctrlKey)return;
 if(grid.scrollWidth>grid.clientWidth&&grid.scrollHeight<=grid.clientHeight+1&&Math.abs(e.deltaY)>Math.abs(e.deltaX)){
  e.preventDefault();grid.scrollLeft+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?grid.clientWidth:1);saveScroll();
 }
},{passive:false});
listen(root,'scroll',e=>{if(e.target.matches?.('[data-scroll-zone],[data-board-scroll]'))saveScroll();},{capture:true});
listen(window,'blur',()=>cancelGesture());
listen(document,'visibilitychange',()=>{if(document.hidden)cancelGesture();});
listen(document,'pointerdown',e=>{if(e.isPrimary===false)cancelGesture();},{capture:true});
listen(document,'pointerup',e=>{if(gesture?.pointer===e.pointerId&&!root.contains(e.target))cancelGesture();});

listen(root,'click',event=>{
 if(event.detail!==0&&Date.now()<suppressUntil){event.preventDefault();return;}
 cancelGesture(false);
 const b=event.target.closest('button[data-action]');if(!b||!root.contains(b)||b.disabled)return;
 const {action,key,id,uid,zone}=b.dataset;
 if(action==='back'){cancelGesture();options.onBack?.();}
 else if(action==='tab'){view.tab=id;render();}
 else if(action==='detail')openDialog('detail',key,id,uid,zone);
 else if(action==='review'){if(runtime)void runtimeAction('review');else openDialog('review');}
 else if(action==='close')closeDialog();
 else if(action==='reset'){current=clone(fixture.initial);draft=freshDraft();view=emptyView();render(false);notify('操作案を最初の状態に戻しました。');}
 else mutate(action,key,id,uid);
});
listen(overlay,'click',event=>{if(event.target===overlay)closeDialog();});
listen(root,'keydown',event=>{
 if(event.key==='Escape'&&gesture){event.preventDefault();cancelGesture();return;}
 if(!view.dialog){const grid=event.target.closest('[data-scroll-zone]');if(grid&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const d=dimensions();if(event.key==='ArrowLeft'||event.key==='ArrowRight')grid.scrollLeft+=(event.key==='ArrowLeft'?-1:1)*(d.tileWidth+d.gap);else grid.scrollTop+=(event.key==='ArrowUp'?-1:1)*(d.tileHeight+d.gap);saveScroll();}return;}
 if(event.key==='Escape'){event.preventDefault();closeDialog();}
 if(event.key==='Tab'){
  const buttons=[...overlay.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
let previousWidth=0;
const resizeObserver=globalThis.ResizeObserver?new ResizeObserver(entries=>{const w=Math.round(entries[0].contentRect.width);if(w!==previousWidth){previousWidth=w;syncPreview();}}):null;
resizeObserver?.observe(root);
render();
syncPreview();
const acquisitionHandle={snapshot:()=>clone({current,draft,view}),modified:()=>dirty()||(!runtime&&JSON.stringify(current)!==JSON.stringify(fixture.initial)),
 setTab(tab){if(['card','passive'].includes(tab)){view.tab=tab;render();}},
 suspend(){cancelGesture();if(view.dialog)closeDialog();},
 dispose(){runtimeOff?.();cancelGesture();eventScope.abort();resizeObserver?.disconnect();holdCue.dispose();root.replaceChildren();}};
if(runtime)runtimeOff=runtime.subscribe(runtimeReceive);
options.onReady?.(acquisitionHandle);

return acquisitionHandle;};})(globalThis.CrossweaveUI);