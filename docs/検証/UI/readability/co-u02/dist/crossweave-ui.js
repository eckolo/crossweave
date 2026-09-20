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
      canRetry:!!failed,localDirty:!!view&&!same(draft,view.display_data.draft?.plan ?? currentPlan(view))});
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
      const learned=new Set(view.display_data.home?.economy.learned.map(x=>x.base)||[]);
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
  const api={makeSession,makeLauncher,currentPlan,validateView};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.CrossweaveUI=api;
})(globalThis);

/* Presentation geometry only. Input rectangles must come from visible UI objects. */
(function(api){'use strict';
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
   const lines=api.proseLines(source,text=>{probe.textContent=text;return probe.getBoundingClientRect().width<=available-.5;});
   probe.remove();node.replaceChildren(...lines.map(text=>{const line=document.createElement('span');line.className='cw-prose-line';line.textContent=text;return line;}));
   cache.set(node,{source,key});
  }
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
  let previousToken=null,reservationToken=null,dead=false,drag=null,actorHold=null,suppressUntil=0,hoverTimer=null,leaveTimer=null,forecast=null,lastShownTarget=null,lastShownReservation=null,gestureEpoch=0;
  const settings={diagram:true,details:true,quick:true,drag:true,hold:220};
  const events=new AbortController(),timers=new Set();
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);if(!dead)fn();},ms);timers.add(t);return t;};
  let historyCursor=list(display_data.exploration?.public_history).length,feedTimer=null;
  const feedQueue=[],feedVisible=[];
  root.classList.add('cw-explore');root.setAttribute('aria-label','crossweave 探索');
  root.innerHTML=`<div id="cw-scene" aria-hidden="true"><div id="cw-scene-base"></div></div>
   <section class="cw-region cw-world" aria-label="相手と環境"><div class="cw-heading"><div class="cw-order-strip"><ol id="cw-turn-order" aria-label="現在の行動予約"></ol></div></div><div class="cw-scroll" id="cw-actors"></div><div class="cw-scroll-help" data-track="cw-actors"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-board" id="cw-drop-zone" aria-label="札を出す場"><div class="cw-heading"><span id="cw-match-label"></span></div><div class="cw-scroll" id="cw-field"></div><div class="cw-scroll-help" data-track="cw-field"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-hand-region" aria-label="手札"><div class="cw-heading"><span id="cw-notice" role="status"></span></div><div class="cw-scroll" id="cw-hand"></div><div class="cw-scroll-help" data-track="cw-hand"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div><div id="cw-action-track"><div class="cw-actions" id="cw-action-anchor" hidden><button type="button" data-x="preview">予測</button><button type="button" id="cw-use" data-x="use" class="cw-primary">場に出す</button></div></div></section>
   <footer class="cw-bottom"><div class="cw-footer-state"><div class="cw-self" id="cw-self" aria-label="本人の状態"></div><span id="cw-hand-count"></span></div><nav class="cw-menu" aria-label="探索メニュー">${menuButton('target-info','対象の詳細','info')}${menuButton('more','メニュー','menu')}</nav><button type="button" data-x="withdraw">撤退</button></footer>
   <div class="cw-event-region" aria-label="直前の行動"><ol id="cw-event-feed" aria-live="polite" aria-relevant="additions"></ol></div>
   <svg id="cw-relations" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden></svg><div id="cw-drag-ghost" aria-hidden="true" hidden></div>
   <section class="cw-drawer" id="cw-drawer" role="dialog" aria-label="詳細" hidden><header><button type="button" data-x="window-back" aria-label="元の窓に戻る" hidden>${symbol('arrow-left','←')}</button><strong id="cw-drawer-title"></strong><button type="button" data-x="pin" aria-label="固定する" id="cw-window-state">${symbol('pin','📌')}</button><button type="button" data-x="close" aria-label="詳細を閉じる">×</button></header><div class="cw-drawer-body"></div></section>
   <section class="cw-drawer" id="cw-parent-drawer" role="dialog" aria-label="探索メニュー" hidden><header><strong></strong><button type="button" data-x="parent-pin" aria-label="固定する">${symbol('pin','📌')}</button><button type="button" data-x="parent-close" aria-label="窓を閉じる">×</button></header><div class="cw-drawer-body"></div></section>`;
  const $=s=>root.querySelector(s),x=()=>data.exploration,details=id=>data.details?.[id];
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
  const choices=()=>list(x()?.legal_actions).map(a=>a.choice??a).filter(a=>a.card_id===selected);
  const choice=()=>choices().find(a=>a.target===target)||choices().find(a=>a.target===null)||null;
  // Keep the player's target across turns, as in formal v0.15. Derive a first
  // target only from public legal choices, preferring the passage when present.
  function retainTarget(legal=choices()){
   const allowed=legal.filter(a=>a.target!==null).map(a=>a.target),candidates=actors().filter(a=>a.id!==x().self.id&&(!allowed.length||allowed.includes(a.id)));
   if(candidates.some(a=>a.id===target))return;
   target=candidates.find(a=>a.purpose==='passage')?.id??candidates[0]?.id??null;
  }
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
  const art=(kind,k)=>`<span class="cw-illustration" data-art-kind="${kind}" aria-hidden="true">${icon(k)}</span>`;
  const attribute=c=>`<span class="cw-attr">${esc(c.attr)}</span>`;
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
   feedVisible.push(node);$('#cw-event-feed').prepend(node);feedVisible.forEach((el,i)=>el.style.bottom=i*26+'px');
   later(()=>{node.dataset.fading='true';},1300);
   later(()=>{const i=feedVisible.indexOf(node);if(i>=0)feedVisible.splice(i,1);node.remove();feedVisible.forEach((el,j)=>el.style.bottom=j*26+'px');if(feedTimer===null)pumpEvent();},2800);
   feedTimer=later(pumpEvent,260);
  }
  function updateEvents(){const rows=list(x()?.public_history);if(rows.length<historyCursor){feedQueue.length=0;feedVisible.splice(0).forEach(el=>el.remove());historyCursor=rows.length;return;}
   feedQueue.push(...rows.slice(historyCursor).map(r=>({time:r.time,text:eventText(r)})));historyCursor=rows.length;if(feedTimer===null)pumpEvent();
  }
  function windowContent(w=windowState,popup=$('#cw-drawer')){if(!w)return;
   let title='',body='';
   if(['card','field','preview'].includes(w.type)){title=names(w.id);body=w.type==='preview'?prediction():cardDetails(w.id);}
   if(w.type==='actor'){const a=actor(w.id);title=a?.name||'相手';body=a?`<p>${esc(a.remaining_label)} ${a.hp}/${a.max_hp} · 隠蔽 ${a.posture_remaining}/${a.max_posture}</p><dl class="cw-ledger">${['guard','crit','evasion'].map(k=>`<dt>${term(k)}</dt><dd>${esc(k==='guard'?a.defense?.guard??a.guard?.value??0:a[k])}</dd>`).join('')}</dl>`+(a.defense?.effects.length?'<h3>防御の内訳</h3><p>身構 '+esc(api.defenseDuration(a.defense.duration.guard))+' · 攪乱 '+esc(api.defenseDuration(a.defense.duration.evasion))+'</p><ul>'+a.defense.effects.map(e=>'<li>'+esc(names(e.source_actor_id))+' · 身構 '+e.guard+' / 攪乱 '+e.evasion+' · '+(e.uses===null?'回数制限なし':e.uses+'回')+'</li>').join('')+'</ul>':'')+(a.knowledge_key&&onCommon?'<button type="button" data-x="actor-record" data-key="'+esc(a.knowledge_key)+'">この相手の調査記録</button>':''):'<p>この対象は離脱しました</p>';}
   if(w.type==='order'){const predicted=forecast?.key===forecastKey()?api.projectReservations(data,forecast.value):null,rows=predicted?.flatMap(g=>g.rows)||state.reservations||forecast?.value?.current_reservations;title=predicted?'行動後の予約':'行動予約';body=rows?`<ol class="cw-reservations">${rows.map(r=>`<li ${r.nextSelf?'data-self-next':''}><span>${esc(names(r.actor))}${r.nextSelf?'・次':''}</span><b>${esc(signed(r.at-x().now))}</b></li>`).join('')}</ol>`:'<p>予約の公開応答を確認中…</p>';}
   if(w.type==='more'){title='探索メニュー';body=`<nav class="cw-more">${[['objective','目的','flag'],['status','状況','activity'],['order','行動順','list-ordered'],['deck','山札','layers'],['history','履歴','history'],['texts','文章の記録','book-open'],['records','調査記録','book-open'],['settings','操作','sliders-horizontal'],['menu','設定・保存','settings']].filter(([k])=>onCommon||!['records','menu','texts'].includes(k)).map(args=>menuButton(...args)).join('')}</nav>`;}
   if(w.type==='objective'){title='目的';const t=list(data.texts).find(t=>t.id===data.case?.objective_text_id);body=`<p>${esc(t?.short_text||'目的の本文はまだ公開されていません')}</p>`;}
   if(w.type==='status'){title='状況';body=`<p>時刻 ${x().now} · 本人の行動 ${x().self.actions}回</p>`+actors().map(a=>`<p>${esc(a.name)}：${esc(a.remaining_label)} ${a.hp}/${a.max_hp} · ${label('crit','一閃')} ${a.crit}</p>`).join('');}
   if(w.type==='deck'){title='本人の札';body=`<p>山札 ${x().self.deck_count}枚 · 手札 ${hand().length}枚 · 共有回収 ${x().recovery_count}枚</p><table class="cw-deck-table"><thead><tr><th>札</th><th>持込</th><th>山札</th><th>手札</th></tr></thead><tbody>${(x().deck_catalogue?.entries||[]).map(r=>`<tr><td><button type="button" data-x="deck-detail" data-id="${esc(r.detail_id)}">${esc(details(r.detail_id)?.name||r.card?.name||'札')}</button></td><td>${r.initial_count??'—'}</td><td>${r.deck_count}${r.doomed_deck_count?`<small>（消滅予定${r.doomed_deck_count}）</small>`:''}</td><td>${r.hand_count}${r.doomed_hand_count?`<small>（消滅予定${r.doomed_hand_count}）</small>`:''}</td></tr>`).join('')}</tbody></table><p>相手の現在の内訳・共有回収の内訳は未公開</p>`;}
   if(w.type==='history'){title='履歴';body=`<ol>${history()}</ol>`;}
   if(w.type==='settings'){title='操作';body=`<p>札はタップで選択・詳細。相手はタップで対象指定、長押しで詳細。情報ボタンからも選択中の相手を確認できます。短く押し続けて場へ運ぶと出札できます。押してすぐ横へ動かすと手札を送ります。</p>${[['diagram','関係線を表示'],['details','札の選択時に詳細を開く'],['quick','通常の設置をすぐ実行'],['drag','ドラッグを使う']].map(([k,l])=>`<label><input type="checkbox" data-x-setting="${k}" ${settings[k]?'checked':''}> ${l}</label>`).join('')}<label>つかむまで <select data-x-hold><option value="150">0.15秒</option><option value="220">0.22秒</option><option value="320">0.32秒</option></select></label>`;}
   const bodyNode=popup.querySelector('.cw-drawer-body'),key=w.type+':'+w.id,same=bodyNode.dataset.content===key,scroll=same?bodyNode.scrollTop:0;
   popup.querySelector('header strong').textContent=w.type==='preview'?'予測 · '+title:title;bodyNode.innerHTML=body;bodyNode.dataset.content=key;bodyNode.scrollTop=scroll;
   popup.hidden=false;popup.dataset.window=w.type;popup.setAttribute('aria-label',title);
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
   // Keep a completed actor hold until release so its context menu/click stays suppressed.
   if(!actorHold?.held)cancelActorHold(true);
   if(source){if(windowState?.type==='more'){windowParent={...windowState};const a=source.getBoundingClientRect(),r=root.getBoundingClientRect();parentRect=a.width?{left:a.left-r.left,top:a.top-r.top,width:a.width,height:a.height}:null;}}
   else {windowParent=null;parentRect=null;}
   if(pinned&&windowState?.type===type&&windowState.id===id){if(windowState.pinned){close();return;}windowState.pinned=true;}
   else windowState={type,id,pinned};
   windowContent();layout();
  }
  function redraw(){if(dead||!x())return;const c=card();
   const scrolls=['cw-actors','cw-field','cw-hand','cw-turn-order'].map(id=>[id,$('#'+id).scrollLeft]);
   root.dataset.cardDrag=String(settings.drag);root.setAttribute('aria-busy',String(!!state.pending));
   $('#cw-actors').innerHTML=actors().filter(a=>a.id!==x().self.id).map(a=>`<article class="cw-actor-item"><button type="button" class="cw-actor" data-x-actor="${esc(a.id)}" aria-label="${target===a.id?'対象：':''}${esc(a.name)}。タップで対象指定、長押しで詳細" aria-pressed="${target===a.id}">${art('actors',a.purpose)}<span class="cw-face-caption"><strong>${target===a.id?`<span class="cw-target-mark" aria-hidden="true">${symbol('crosshair','⊕')}</span>`:''}${esc(a.name)}</strong>${vitals(a)}${actorStats(a)}</span></button></article>`).join('');
   const attrs=[...new Set([...field().map(c=>c.attr),...hand().map(c=>c.attr)])];
   const fieldPrediction=projected()?.field;
   $('#cw-field').innerHTML=attrs.map(attr=>{const f=field().find(f=>f.attr===attr),ghost=!f&&fieldPrediction?.kind==='place'&&fieldPrediction.attr===attr?fieldPrediction:null,consumes=f&&fieldPrediction?.kind==='consume'&&fieldPrediction.id===f.id,tag=f?'button':'div',guard=['guard','defense_support'].includes(c?.kind)&&c.attr===attr;return `<${tag} ${f?`type="button" data-x-field="${esc(f.id)}"`:''} class="cw-slot${ghost?' cw-field-forecast':''}" data-x-attr="${esc(attr)}" data-linked="${c?.attr===attr}" data-forecast="${ghost?'place':consumes?'consume':''}">${f?art('cards',f.kind):''}<span class="cw-face-caption"><strong>${esc(attr)} ${f?esc(names(f.id)):ghost?esc(ghost.name):''}</strong>${f||ghost?`<span class="cw-stat-line">${stat(guard?'guard':'power',f?f.field_power:ghost.power)}${stat(guard?'evasion':'hit',f?f.field_hit:ghost.hit)}</span>`:''}${ghost||consumes?`<small class="cw-field-change">${ghost?'＋ 予測':'使用後に場から離れる'}</small>`:''}</span></${tag}>`;}).join('');
   $('#cw-hand').innerHTML=hand().map(h=>`<article class="cw-hand-card" data-selected="${h.id===selected}"><button type="button" class="cw-select" data-x-card="${esc(h.id)}" aria-pressed="${h.id===selected}">${art('cards',h.kind)}<span class="cw-face-caption"><strong>${attribute(h)}${esc(names(h.id))}</strong><span class="cw-stat-line">${main(h)}</span><span class="cw-life ${h.remaining===1?'cw-loss':''}">${h.remaining===1?'今回まで':'あと'+h.remaining+'行動'}</span></span></button></article>`).join('');
   const reservations=state.reservations||forecast?.value?.current_reservations;
   const predicted=forecast?.key===forecastKey()?api.projectReservations(data,forecast.value):null;
   const turnFace=r=>`<button type="button" data-x-order="${esc(r.actor)}" ${r.nextSelf?'data-self-next':''} aria-label="${esc(names(r.actor))}、${r.nextSelf?'行動後の次回予約':'予約'} +${r.at-x().now}"><span class="cw-turn-face">${icon(actor(r.actor)?.purpose)}</span>${r.nextSelf?'<b>次</b>':''}</button>`;
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
   const q=choice(),verb=q?q.target?(actor(q.target)?.action_label||'攻撃'):match?(c.kind==='guard'?label('guard','身構'):c.kind==='heal'?'回復':c.kind==='defense_support'?'付与':'一致して使う'):'場に置く':'対象を選択';
   $('#cw-use').textContent=verb;$('#cw-use').setAttribute('aria-label',q?.target?names(q.target)+'を対象に'+verb:verb);
   $('[data-x="target-info"]').disabled=!target;
   $('#cw-use').disabled=busy()||!q||!session.can('play');$('[data-x="preview"]').disabled=(!q||busy())&&windowState?.type!=='preview';
   $('[data-x="preview"]').setAttribute('aria-expanded',String(windowState?.type==='preview'));
   $('[data-x="withdraw"]').disabled=busy()||!session.can('withdraw');
   root.dataset.selection=String(!!c);
   if(windowState)windowContent();scrolls.forEach(([id,v])=>$('#'+id).scrollLeft=v);
   root.querySelectorAll('button').forEach(b=>b.classList.add('cursor-interaction'));
   if(typeof lucide!=='undefined')lucide.createIcons({attrs:{width:16,height:16}});queueMicrotask(layout);
   if(q&&!busy())requestForecast();
  }
  function layout(){if(dead)return;const rr=root.getBoundingClientRect();if(!rr.width||!rr.height)return;
   root.dataset.compact=String(rr.height<410);root.dataset.dense=String(rr.height<280);
   root.style.setProperty('--cw-footer-height','44px');
   const nextButton=$('#cw-turn-order [data-self-next]'),nextKey=nextButton?forecast?.key:null;
   if(nextKey!==lastShownReservation){const row=$('#cw-turn-order'),a=nextButton?.getBoundingClientRect(),r=row.getBoundingClientRect();if(a?.width&&r.width){if(a.left<r.left)row.scrollLeft-=r.left-a.left;else if(a.right>r.right)row.scrollLeft+=a.right-r.right;}lastShownReservation=nextKey;}

   if(lastShownTarget!==target){const selectedActor=[...root.querySelectorAll('[data-x-actor]')].find(e=>e.dataset.xActor===target),row=$('#cw-actors'),ar=selectedActor?.getBoundingClientRect(),trackRect=row.getBoundingClientRect();if(ar?.width&&trackRect.width){if(ar.left<trackRect.left)row.scrollLeft-=trackRect.left-ar.left;else if(ar.right>trackRect.right)row.scrollLeft+=ar.right-trackRect.right;}lastShownTarget=target;}
   const node=[...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===selected),cr=node?.getBoundingClientRect(),track=$('#cw-action-track'),tr=track.getBoundingClientRect(),dock=$('#cw-action-anchor');
   dock.hidden=!node;if(node){const width=dock.getBoundingClientRect().width||164;dock.style.left=Math.max(0,Math.min(tr.width-width,(cr.left+cr.right)/2-tr.left-width/2))+'px';}
   for(const el of root.querySelectorAll('[data-track]')){const row=$('#'+el.dataset.track),overflow=row.scrollWidth>row.clientWidth+2;el.dataset.hidden=String(!overflow);el.querySelector('span').textContent=row.children.length+'件';el.querySelector('button:first-child').disabled=row.scrollLeft<=2;el.querySelector('button:last-child').disabled=row.scrollLeft>=row.scrollWidth-row.clientWidth-2;}
   if(windowState){const popup=$('#cw-drawer'),w=windowState;
    const attr={card:'xCard',preview:'xCard',actor:'xActor',field:'xField',order:'xOrder'}[w.type];
    const source=attr?[...root.querySelectorAll('[data-x-card],[data-x-actor],[data-x-field],[data-x-order]')].find(e=>e.dataset[attr]===w.id):root.querySelector('[data-x="'+w.type+'"]');
    const rect=el=>{const a=el?.getBoundingClientRect();return a&&a.width&&a.height?{x:a.left-rr.left,y:a.top-rr.top,w:a.width,h:a.height}:null;};
    const anchor=rect(source);
    const avoid=[rect($('#cw-actors')),!dock.hidden?rect(dock):null,rect($('.cw-bottom'))].filter(Boolean);
    const p=api.placeWindow({width:rr.width,height:rr.height,anchor,avoid,preferredWidth:320,preferredHeight:260,margin:6,minWidth:144,minHeight:64});
    const place=(el,q)=>Object.assign(el.style,{width:q.width+'px',height:q.height+'px',maxHeight:q.height+'px',top:q.top+'px',left:q.left+'px'});
    if(windowParent){const pair=api.placeWindowPair({width:rr.width,height:rr.height,parent:parentRect||p,preferredWidth:320,preferredHeight:260});place($('#cw-parent-drawer'),pair[0]);place(popup,pair[1]);}else place(popup,p);
   }
   api.layoutProse(root);drawRelations(rr);
  }
  function drawRelations(rr){const svg=$('#cw-relations'),c=card(),q=choice();svg.replaceChildren();svg.hidden=!settings.diagram||!c;svg.toggleAttribute('hidden',!settings.diagram||!c);if(!settings.diagram||!c)return;
   svg.setAttribute('viewBox',`0 0 ${rr.width} ${rr.height}`);
   const point=(node,track,edge)=>{if(!node)return null;const b=node.getBoundingClientRect(),r=track.getBoundingClientRect();const l=Math.max(b.left,r.left,rr.left),right=Math.min(b.right,r.right,rr.right);if(right-l<4)return null;return {x:(l+right)/2-rr.left,y:(edge==='top'?b.top:b.bottom)-rr.top};};
   const h=point([...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===c.id),$('#cw-hand'),'top');
   const fNode=[...root.querySelectorAll('[data-x-attr]')].find(e=>e.dataset.xAttr===c.attr),fBottom=point(fNode,$('#cw-field'),'bottom'),fTop=point(fNode,$('#cw-field'),'top');
   const dst=q?.target?[...root.querySelectorAll('[data-x-actor]')].find(e=>e.dataset.xActor===q.target):null;
   const end=dst?point(dst,$('#cw-actors'),'bottom'):null;
   const ns='http://www.w3.org/2000/svg';
   for(const [a,b] of [[h,fBottom],[fTop,end]])if(a&&b){const p=document.createElementNS(ns,'path'),mid=(a.y+b.y)/2;p.setAttribute('d',`M${a.x},${a.y} C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','2');svg.append(p);}
  }
  async function select(id){if(busy())return;const previous=selected;selected=id;retainTarget();previewChoice=null;if(root.dataset.dense==='true'&&previous!==id)close();redraw();if(settings.details&&root.dataset.dense!=='true'||previous===id)open('card',id,true);}
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
   const a=e.target.closest('[data-x-actor]');if(a){if(busy())return;target=a.dataset.xActor;previewChoice=null;close();redraw();return;}
   const f=e.target.closest('[data-x-field]');if(f){open('field',f.dataset.xField);return;}
   const o=e.target.closest('[data-x-order]');if(o){open('order',o.dataset.xOrder);return;}
   const scroll=e.target.closest('[data-x-scroll]');if(scroll){const row=$('#'+scroll.closest('[data-track]').dataset.track);row.scrollLeft+=Number(scroll.dataset.xScroll)*row.clientWidth*.8;layout();return;}
   const b=e.target.closest('[data-x]');if(!b){if(windowState&&!e.target.closest('.cw-drawer'))close();return;}if(b.disabled)return;
   const k=b.dataset.x;if(onCommon&&['records','menu','texts'].includes(k)){e.stopPropagation();close();onCommon(k,b);return;}if(k==='close'||k==='window-back'){backWindow();return;}if(k==='parent-close'){close();return;}if(k==='pin'||k==='parent-pin'){const w=k==='parent-pin'?windowParent:windowState;w.pinned=!w.pinned;windowContent();layout();return;}
   if(k==='actor-record'){e.stopPropagation();const key=b.dataset.key;close();onCommon?.('records',b,key);return;}if(k==='deck-detail'){open('card',b.dataset.id,true,b.closest('.cw-drawer'));return;}
   if(k==='target-info'){if(target)open('actor',target);return;}
   if(k==='preview'){await preview();return;}if(k==='use'){await perform();return;}if(k==='scene'){onScene?.();return;}if(k==='withdraw'){onWithdraw?.();return;}open(k,null,true,b.closest('.cw-drawer'));
  },{signal:events.signal});
  root.addEventListener('change',e=>{interruptGestures();const k=e.target.dataset.xSetting;if(k)settings[k]=e.target.checked;if(e.target.hasAttribute('data-x-hold'))settings.hold=Number(e.target.value);root.dataset.cardDrag=String(settings.drag);layout();},{signal:events.signal});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){interruptGestures();close();}},{signal:events.signal});
  root.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;clearTimeout(leaveTimer);const b=e.target.closest('.cw-menu [data-x],#cw-use');if(!b||b.disabled||b.contains(e.relatedTarget)||(windowState?.pinned&&b.id!=='cw-use'))return;clearTimeout(hoverTimer);hoverTimer=later(()=>{if(b.id==='cw-use')preview(false);else if(!['scene','records','menu','target-info'].includes(b.dataset.x))open(b.dataset.x,null,false);},180);},{signal:events.signal});
  root.addEventListener('pointerout',e=>{if(e.target.contains(e.relatedTarget))return;clearTimeout(hoverTimer);if(!e.relatedTarget?.closest?.('#cw-drawer'))leaveTimer=later(()=>{if(windowState&&!windowState.pinned)close();},160);},{signal:events.signal});
  function cancelDrag(suppress=true,repaint=true){const d=drag;if(!d)return;drag=null;clearTimeout(d.timer);
   // Clear ownership before release, which may synchronously emit lost capture.
   if(root.hasPointerCapture?.(d.pointer))root.releasePointerCapture(d.pointer);
   $('#cw-drag-ghost').hidden=true;$('#cw-drop-zone').dataset.drag='false';if(suppress)suppressUntil=Date.now()+500;
   if(repaint&&d.held&&!dead)redraw();
  }
  function cancelActorHold(suppress=false){if(!actorHold)return;clearTimeout(actorHold.timer);actorHold=null;if(suppress)suppressUntil=Date.now()+500;}
  function interruptGestures(){gestureEpoch++;clearTimeout(hoverTimer);clearTimeout(leaveTimer);cancelActorHold(true);cancelDrag();}
  function positionHeldCard(point){
   const r=root.getBoundingClientRect(),g=$('#cw-drag-ghost'),size=g.getBoundingClientRect(),width=size.width||180,height=size.height||76;
   g.style.left=Math.max(0,Math.min(r.width-width,point.clientX-r.left-width/2))+'px';
   g.style.top=Math.max(0,Math.min(r.height-height,point.clientY-r.top-height+6))+'px';
  }
  root.addEventListener('pointerdown',e=>{if(e.isPrimary===false){interruptGestures();return;}if(e.button!==0||busy()||drag||actorHold)return;
   gestureEpoch++;suppressUntil=0;
   const a=e.target.closest('[data-x-actor]');if(a){cancelActorHold();const current=actorHold={id:a.dataset.xActor,pointer:e.pointerId,x:e.clientX,y:e.clientY,held:false,moved:false,token:state.view.meta.view_token};current.timer=later(()=>{if(actorHold!==current||current.moved||state.view.meta.view_token!==current.token)return;current.held=true;open('actor',current.id,true);},350);return;}
   const c=e.target.closest('[data-x-card]');if(!c||!settings.drag)return;
   drag={id:c.dataset.xCard,pointer:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,initialScroll:$('#cw-hand').scrollLeft,scroll:false,held:false,token:state.view.meta.view_token};
   const current=drag;current.timer=later(()=>{
    if(drag!==current||drag.scroll||dead||busy()||!settings.drag||current.token!==state.view.meta.view_token)return;
    drag.held=true;selected=drag.id;previewChoice=null;retainTarget();close();redraw();
    const ghost=$('#cw-drag-ghost');ghost.textContent=names(drag.id);ghost.hidden=false;$('#cw-drop-zone').dataset.drag='true';
    positionHeldCard({clientX:drag.lastX,clientY:drag.lastY});root.setPointerCapture?.(e.pointerId);
   },settings.hold);
  },{signal:events.signal});
  root.addEventListener('pointermove',e=>{if(actorHold?.pointer===e.pointerId&&Math.hypot(e.clientX-actorHold.x,e.clientY-actorHold.y)>8){clearTimeout(actorHold.timer);actorHold.moved=true;}
   if(!drag||drag.pointer!==e.pointerId)return;drag.lastX=e.clientX;drag.lastY=e.clientY;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(!drag.held&&(drag.scroll||Math.hypot(dx,dy)>8)){clearTimeout(drag.timer);drag.scroll=true;$('#cw-hand').scrollLeft=drag.initialScroll-dx;e.preventDefault();layout();return;}
   if(drag.held){e.preventDefault();positionHeldCard(e);}
  },{signal:events.signal,passive:false});
  root.addEventListener('pointerup',async e=>{if(actorHold?.pointer===e.pointerId){if(actorHold.held||actorHold.moved)suppressUntil=Date.now()+500;cancelActorHold();return;}
   const d=drag;if(!d||d.pointer!==e.pointerId)return;const hit=document.elementFromPoint?.(e.clientX,e.clientY);cancelDrag(false,false);if(!d.held&&!d.scroll)return;suppressUntil=Date.now()+500;if(!d.held||d.token!==state.view.meta.view_token)return;redraw();
   if(!hit||!$('#cw-drop-zone').contains(hit))return;
   const q=choice();if(!q)return;
   const key=forecastKey(),epoch=gestureEpoch,p=await requestForecast();if(!p||dead||forecastKey()!==key||gestureEpoch!==epoch)return;
   previewChoice=JSON.parse(JSON.stringify(q));const loses=(p.unused_hand_expiry||[]).some(a=>a.expires&&a.destination==='destroyed');
   if(settings.quick&&p?.mode==='place'&&!loses)await perform();else{windowState={type:'preview',id:selected,pinned:true};windowContent();layout();}
  },{signal:events.signal});
  for(const type of ['pointercancel','lostpointercapture'])root.addEventListener(type,e=>{if(drag?.pointer===e.pointerId||actorHold?.pointer===e.pointerId)interruptGestures();},{signal:events.signal});
  root.addEventListener('pointerleave',()=>{cancelActorHold(true);if(drag&&!drag.held)interruptGestures();},{signal:events.signal});
  root.addEventListener('contextmenu',e=>{if(drag||actorHold?.held)e.preventDefault();},{signal:events.signal});
  root.addEventListener('scroll',e=>{if(e.target.id==='cw-actors')cancelActorHold(true);if(e.target.id==='cw-hand'&&drag&&!drag.held&&!drag.scroll&&Math.abs(e.target.scrollLeft-drag.initialScroll)>1)interruptGestures();layout();},{capture:true,signal:events.signal});
  $('#cw-hand').addEventListener('wheel',interruptGestures,{passive:true,signal:events.signal});
  window.addEventListener('blur',interruptGestures,{signal:events.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)interruptGestures();},{signal:events.signal});
  document.addEventListener('pointerdown',e=>{if((drag||actorHold)&&e.isPrimary===false)interruptGestures();},{capture:true,signal:events.signal});
  document.addEventListener('pointerup',e=>{if(!root.contains(e.target)&&(drag?.pointer===e.pointerId||actorHold?.pointer===e.pointerId))interruptGestures();},{signal:events.signal});
  const observer=new ResizeObserver(layout);observer.observe(root);
  function update(d,s=session.state()){data=d;state=s;if(!x())return;
   updateEvents();
   const token=s.view.meta.view_token;if(previousToken&&token!==previousToken){gestureEpoch++;cancelDrag(true,false);cancelActorHold(true);selected=null;previewChoice=null;forecast=null;close();}previousToken=token;
   retainTarget();
   if(selected&&!hand().some(c=>c.id===selected)){selected=null;close();}redraw();
   if(!selected&&!state.reservations&&!state.pending&&!state.error&&reservationToken!==token&&session.can('previewAction')){reservationToken=token;queueMicrotask(()=>{if(!dead&&!selected&&!state.pending)session.reservations();});}
  }
  update(data,state);
  document.fonts?.ready.then(()=>{if(!dead)layout();});
  return {update,dispose(){dead=true;cancelDrag();cancelActorHold();observer.disconnect();events.abort();for(const t of timers)clearTimeout(t);root.replaceChildren();root.classList.remove('cw-explore');}};
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

/* UI geometry only. The header/footer each reserve a 44px action row. */
(function(api){'use strict';
api.journeyLayout=function(width,total,anchor=0,reserved=0){
 const compact=width<=400,padding=compact?0:8,gap=compact?4:8;
 const height=width*9/16,availableHeight=height-90-padding*2-reserved,availableWidth=width-2-padding*2;
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
  const launcher=api.makeLauncher(Campaign,config),events=new AbortController();
  let child=null,connecting=false,reading=false,dead=false,importing=false,raw='',filename='',error='',message='';
  const busy=()=>connecting||reading||launcher.state().pending;
  const explain=e=>api.saveFailureText(e)||'開始できませんでした。保存と入力は保持しています。';
  const button=(label,action,disabled=false)=>'<button type="button" data-launch="'+action+'" class="cj-button cursor-interaction" '+(disabled?'disabled':'')+'>'+label+'</button>';
  const resize=()=>{if(child||dead)return;const shell=root.querySelector('.cj-shell'),width=root.getBoundingClientRect().width;if(shell&&width>0)shell.style.height=width*9/16+'px';};
  const observer=new ResizeObserver(resize);observer.observe(root);
  function render(){if(dead||child)return;const s=launcher.state(),locked=busy()||s.canRetry;
   root.dataset.screen='start';root.dataset.storageMode=storageMode;
   const content=importing?'<label class="cj-import-file">保存ファイル<input type="file" accept=".json,application/json" data-launch-file '+(locked?'disabled':'')+'></label><p class="cj-import-name">'+escape(filename)+'</p>':'<h2>crossweave</h2>';
   const actions=importing?button('←','back',locked)+button('読み込む','import',locked||s.active||!raw):button('続きから','open',locked)+button('はじめから','create',locked||s.active)+button('読み込む','import-menu',locked||s.active);
   root.innerHTML='<div class="cj-shell cj-launch-shell"><header class="cj-header"><span class="cj-screen-title">'+(importing?'保存を読み込む':'crossweave')+'</span></header><main class="cj-layout cj-launch-main">'+content+'<div class="cj-launch-notice" role="'+(error?'alert':'status')+'">'+escape(error||(busy()?'読み込み中…':message))+'</div></main><footer class="cj-fixed-footer">'+(s.canRetry?button('もう一度','retry',busy()):actions)+'</footer></div>';
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
  return {get journey(){return child;},get session(){return child?.session||null;},state:()=>({launcher:launcher.state(),connecting,reading,filename,importing,storageMode}),dispose(){dead=true;off();observer.disconnect();events.abort();launcher.dispose();child?.dispose();root.replaceChildren();}};
 };
})(globalThis.CrossweaveUI);

/* UI-PLAN-001 journey prototype. All game state and prices come from CW-M1-view-1. */
(function(api){'use strict';
api.mountJourney=function(root,{controller,Campaign,slot_id,title,session:providedSession=null,storageMode='ephemeral'}){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=x=>x==null?x:JSON.parse(JSON.stringify(x)),pt=n=>Number.isInteger(n)?String(n/100):'—';
 const session=providedSession||api.makeSession(controller,{reopen:()=>Campaign.open({slot_id})});
 const $=s=>root.querySelector(s),list=x=>Array.isArray(x)?x:Object.values(x||{});
 const icon=n=>'<i data-lucide="'+n+'" aria-hidden="true"></i>';
 const button=(label,action,extra='',kind='')=>'<button type="button" data-j="'+action+'" '+extra+' class="cj-button cursor-interaction '+kind+'">'+label+'</button>';
 let state=session.state(),tab='deck',place=state.view?.display_data.draft?.dirty?'compose':'hub',panel=null,windows=[],child=null,lastScreen=null;
 let message='',continuation=null,running=false,suspended=false,disposed=false,sceneRequested=false;
 let observer=null,recording=false,sceneKey='',seen=new Set(),visible=new Set(),committedFlash=false;
 let recordTab='targets',recordTarget=null,detailFromRecords=false,recordDetail=null,windowAnchor=null,panelTrail=[],recordParentRect=null;
 const recordEntries=new Map(),scrollMemory=new Map();
 let lastContext=null,lastPhase=null;
 let skillFilter='all',menuPage=0;
 let purchaseChoice=null,conversionIds=new Set(),viewToken=null;
 const selected={deck:null,skills:null},pageAnchors={deck:0,skills:0,offers:0,owned:0},events=new AbortController();
 let frameWidth=root.getBoundingClientRect().width||1024;
 root.dataset.storageMode=storageMode;
 root.innerHTML='<div class="cj-shell"><header class="cj-header" data-header></header><div class="cj-status" data-status role="status" aria-live="polite"></div><div class="cj-layout"><main data-main></main><aside data-inspector hidden></aside></div><div data-bottom></div></div>';
 // The frame follows only its parent's width, never the amount of open content.
 const sizeFrame=width=>{if(width>0){const changed=width!==frameWidth;frameWidth=width;$('.cj-shell').style.height=(width*9/16)+'px';if(changed)queueMicrotask(()=>{if(state.view)render();});}queueMicrotask(layoutWindows);};
 const frameObserver=new ResizeObserver(entries=>sizeFrame(entries[0]?.contentRect?.width||root.getBoundingClientRect().width));
 frameObserver.observe(root);sizeFrame(root.getBoundingClientRect().width);
 const d=()=>state.view?.display_data,h=()=>d()?.home,p=()=>state.draft,info=id=>d()?.details?.[id]||state.draftDetails?.[id]||(id==='$purchase'?d()?.details?.[p()?.candidate]:null)||{};
 const name=id=>info(id).name||'詳細未提供';
 const composition=plan=>{if(!plan)return null;const value=clone(plan);value.next_preparation.deck.sort();return value;};
 const dirty=()=>p()&&JSON.stringify(composition(p()))!==JSON.stringify(composition(api.currentPlan(state.view)));
 const busy=()=>running||!!state.pending||state.canRetry||state.stale;
 const canSuspend=()=>!suspended&&d()?.phase==='exploring';
 const learned=base=>p()?.retain_learning.includes(base)||p()?.next_preparation.learn.includes(base);
 const equipped=id=>p()?.next_preparation.equipment.includes(id);
 const count=(id,deck=p()?.next_preparation.deck||[])=>deck.filter(x=>x===id).length;
 const group=ids=>[...new Set(ids)].map(id=>({id,count:count(id,ids)}));
 const itemIcon=id=>info(id).kind==='passive'?'sparkles':({attack:'swords',guard:'shield',heal:'heart-pulse'})[info(id).primary?.kind]||'layers';
 function reason(e){const specific=economyFailure(e);if(specific)return specific;return api.saveFailureText?.(e)||({download_unavailable:'この表示環境ではファイルを書き出せません。保存内容は保持しています',deck_size:'札を12枚にしてください',invalid_deck_size:'札を12枚にしてください',deck_base_cap_exceeded:'同じ札は2枚までです',equipment_capacity_exceeded:'心得の装備枠が足りません',insufficient_learning_funds:'着想が足りません',storage_write_failed:'確定できませんでした。変更案は残っています',stale_revision:'別の操作で変わりました。最新の内容を読み直してください',feature_not_connected:'この機能は未対応です',comparison_required:'変更の確認が必要です',connection_failed:'応答を確認できませんでした'})[e?.code]||'操作を完了できませんでした';}
 function currentScreen(){const v=d();if(suspended)return 'start';if(v.phase==='return')return 'return';if(v.scene?.paused||sceneRequested)return 'scene';if(v.phase==='exploring')return 'explore';return place==='hub'?'hub':tab;}
 function mark(id){return '<span class="cj-mark" aria-hidden="true">'+icon(itemIcon(id))+'</span>';}
 function detailsButton(id,extra=''){return button(mark(id)+'<span>'+esc(name(id))+'</span>','detail','data-id="'+esc(id)+'" '+extra,'cj-object');}
 /* Presentation helpers injected into mountJourney. No private catalogue or price calculation. */
function paragraph(id){const t=d().texts?.[id];return t?'<p data-j-text="'+esc(id)+'">'+esc(t.short_text||t.detail_text||'')+'</p>':'';}
// These public details are short paragraphs. Render them in reading order;
// visibility observation, never DOM insertion, decides the read receipt.
function sceneCopy(){const s=d().scene;if(!s)return '';return '<div class="cj-story">'+[...new Set([...(s.text_ids||[]),...(s.optional_text_ids||[])])].map(paragraph).join('')+'</div>';}
function wallet(){const now=h()?.economy.unspent_units,after=state.comparison?.ok?state.comparison.stages.prepared.unspent_units:null;
 return '<div class="cj-wallet"><span>'+icon('lightbulb')+'着想</span><strong>'+pt(now)+'</strong>'+(dirty()?'<span class="cj-arrow">→</span><strong class="cj-changed">'+pt(after)+'</strong><small>変更案</small>':committedFlash?'<small>確定済み</small>':'')+'</div>';}
function outcome(){return ({clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'})[d().return_receipt?.outcome]||'探索終了';}
function landscape(){return '<div class="cj-landscape cj-backdrop" aria-hidden="true"><div></div><div></div><div></div></div>';}
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
function hubView(){const objective=d().texts?.[d().case.objective_text_id];return '<section class="cj-fixed-hub">'+landscape()+'<section class="cj-destination-summary"><small>'+(d().case.status==='resolved'?'踏破済み':'探索先')+'</small><div class="cj-destination-heading"><h2>'+esc(title)+'</h2>'+button('詳細','destination','aria-label="'+esc(title)+'の詳細"')+'</div><p class="cj-prose">'+esc(objective?.short_text||'')+'</p></section></section>';}
function compactWallet(){const now=h()?.economy.unspent_units,after=state.comparison?.ok?state.comparison.stages.prepared.unspent_units:null;return '<span class="cj-compact-wallet" aria-label="着想 現在 '+pt(now)+(dirty()?'、変更案 '+pt(after):committedFlash?'、確定済み':'')+'">'+icon('lightbulb')+'<span>'+pt(now)+(dirty()?'<span class="cj-changed">→'+pt(after)+'</span>':'')+'</span></span>';}
function catalogueItems(){if(tab==='offers')return h().offers.status==='purchased'?[]:h().candidates.map(x=>x.id);if(tab==='owned')return h().owned.map(x=>x.id);const skills=tab==='skills';const items=[...(skills?h().learning_options.map(x=>'base:'+x.base):h().free_card_options),...h().owned.filter(x=>x.selection_kind===(skills?'equipment':'deck')).map(x=>x.id),...(p()?.candidate&&p().purchase_timing==='before_preparation'&&info(p().candidate).kind===(skills?'passive':'card')?['$purchase']:[])];
 return !skills||skillFilter==='all'?items:items.filter(id=>skillFilter==='learned'?currentlyLearned(info(id).base_id):currentlyEquipped(id));
}
function currentlyLearned(base){return h()?.economy.learned.some(x=>x.base===base);}
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
 if(!known)return button('覚えるだけ','learn',extra+' data-focus="learn-'+esc(id)+'"')+button('覚えて装備','equip',extra+' data-focus="equip-'+esc(id)+'"','cj-primary');
 return button(planned?'習得案を戻す':'忘れる','forget',extra)+button(on?'外す':'装備','equip',extra+' data-focus="equip-'+esc(id)+'"',on?'':'cj-primary');
}
function composeCount(){if(tab==='offers')return h().offers.status==='purchased'?'購入済':h().offers.carried_from_previous_return?'持越し':h().candidates.length+'点';if(tab==='owned')return h().owned.length+'点';const c=state.comparison;return tab==='skills'?(c?.ok?c.prepared.equipment.used:dirty()?'—':h().equipment.used)+'/'+h().equipment.capacity:p().next_preparation.deck.length+'/'+h().deck.required_size;}
function pageButtons(){const layout=api.journeyLayout(frameWidth,catalogueItems().length,pageAnchors[tab],0);return layout.pages>1?'<div class="cj-pager" aria-label="一覧のページ">'+button(icon('chevron-left'),'page','data-step="-1" aria-label="前の一覧" '+(!layout.page?'disabled':''))+'<span aria-live="polite">'+(layout.page+1)+'/'+layout.pages+'</span>'+button(icon('chevron-right'),'page','data-step="1" aria-label="次の一覧" '+(layout.page+1===layout.pages?'disabled':''))+'</div>':'';}
function headerView(screen){const edit=['deck','skills','offers','owned'].includes(screen),labels={return:outcome(),hub:'探索先',scene:title,start:'crossweave'},tabs={deck:'札組',skills:'心得',offers:'購入',owned:'所持'};
 const lead=edit?'<nav class="cj-edit-tabs" aria-label="編成と購入の切替">'+Object.entries(tabs).map(([t,label])=>button('<span>'+label+'</span>'+(tab===t?'<small>'+composeCount()+'</small>':''),t,'aria-pressed="'+(tab===t)+'"')).join('')+'</nav>':'<h1 class="cj-screen-title">'+esc(labels[screen]||'crossweave')+'</h1>';
 const selection=tab==='skills'?'skills:'+skillFilter:tab;
 const mobile=[['deck','札組'],['skills:all','心得・すべて'],['skills:learned','心得・習得済み'],['skills:equipped','心得・装備中'],['offers','購入'],['owned','所持']];
 const filter=tab==='skills'?'<select data-skill-filter class="cj-skill-filter" aria-label="現在の心得を絞り込む">'+[['all','すべて'],['learned','習得済み'],['equipped','装備中']].map(([v,l])=>'<option value="'+v+'" '+(skillFilter===v?'selected':'')+'>'+l+'</option>').join('')+'</select>':'';
 return lead+(edit?'<select data-compose-tab class="cj-compose-select" aria-label="編成と購入の切替">'+mobile.map(([v,l])=>'<option value="'+v+'" '+(selection===v?'selected':'')+'>'+l+'</option>').join('')+'</select>'+filter+pageButtons():'')+(h()?compactWallet():'')+'<nav class="cj-common-nav" aria-label="共通">'+(!edit?button(icon('book-open')+'<span>調査記録</span>','records','aria-label="調査記録"','cj-quiet'):'')+button(icon('menu'),'menu','aria-label="メニュー"','cj-quiet')+'</nav>';
}
function composeActions(){const c=state.comparison;return button('<span>'+(dirty()?'比較':'構成を見る')+'</span>','review','aria-label="'+(dirty()?'現在と変更案を比較':'現在の札組・心得・着想を確認')+'"','cj-review-button')+(dirty()?button('確定','commit','data-j-mutation '+(!c?.ok?'disabled':'')):'')+button(dirty()?'確定して出発':'出発','depart','data-j-mutation '+(dirty()&&!c?.ok?'disabled':''),'cj-primary');}
function footerView(screen){let content='';
 if(['deck','skills','offers','owned'].includes(screen))content=button(icon('arrow-left')+'戻る','hub','aria-label="編成を閉じて拠点に戻る"')+'<div class="cj-fixed-actions">'+(screen==='owned'&&conversionIds.size?button('着想に変える '+conversionIds.size+'点','convert-preview','data-j-mutation','cj-primary'):composeActions())+'</div>';
 else if(screen==='return')content='<span></span>'+button('拠点へ','hub','data-j-mutation','cj-primary');
 else if(screen==='hub')content='<div class="cj-fixed-actions">'+button('札組','deck')+button('心得','skills')+button('購入','offers')+'</div><div class="cj-fixed-actions">'+composeActions()+'</div>';
 else if(screen==='scene')content='<span></span>'+button(d().scene?.paused?'進む':'探索に戻る',d().scene?.paused?'continue':'scene-back','data-j-mutation','cj-primary');
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
 '<div class="cj-summary-actions">'+button(dirty()?'確定して出発':'出発 '+icon('arrow-right'),'depart','data-j-mutation '+(dirty()&&!c?.ok?'disabled':''),'cj-primary')+
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
function detailView(id,{back=false,w=windows.find(x=>x.id===id)}={}){const item=info(id),base=item.base_id,passive=item.kind==='passive',known=learned(base),cancelled=p()?.cancel_learning.includes(base);
 const pinLabel=w?.pinned?'固定を外す':'固定する';
 const head='<div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2 data-tooltip="'+esc(name(id))+'">'+esc(name(id))+'</h2>'+button(icon('pin'),'pin','data-id="'+esc(id)+'" aria-label="'+pinLabel+'" data-tooltip="'+pinLabel+'" aria-pressed="'+!!w?.pinned+'"','cj-icon-button')+(!back?button(icon('x'),'close-item','data-id="'+esc(id)+'" aria-label="詳細を閉じる"','cj-icon-button'):'')+'</div>';
 let body='',actions='';
 if(passive)body+='<div class="cj-detail-cost"><span>枠消費</span><strong>'+item.equipment_cost+'</strong></div>'+skillStructure(item);
 else body+=cardFacts(item);
 body+=affixView(item);
 if(h()?.owned.some(x=>x.id===id)){const row=h().owned.find(x=>x.id===id);body+='<p>'+esc((row.references||[]).map(x=>usageLabels[x]||'使用中').join('・')||(row.eligibility_reason==='owned_but_base_not_learned'?'基礎の心得は未習得':'所持'))+'</p>';}
 if(d().phase==='home'&&passive&&(id.startsWith('base:')||h().owned.some(x=>x.id===id)||id==='$purchase')){actions=skillActions(id);
  body='<p class="cj-skill-state">'+esc(skillState(id))+'</p>'+body+(!known?'<p>覚える費用：着想 −'+pt(item.learning_cost_units)+'</p>':'');
 }else if(d().phase==='home'&&(h().free_card_options.includes(id)||h().owned.some(x=>x.id===id)||id==='$purchase'))actions=button('−1枚','remove','data-id="'+esc(id)+'" data-j-mutation '+(!count(id)?'disabled':''))+ '<strong>'+count(id)+'枚</strong>'+button('+1枚','add','data-id="'+esc(id)+'" data-j-mutation '+(p().next_preparation.deck.filter(x=>info(x).base_id===base).length>=h().deck.per_base_cap||(!id.startsWith('base:')&&count(id))?'disabled':''));
 else if(!(h()?.free_card_options||[]).includes(id)&&item.kind==='card')body+='<p class="cj-muted">未所持。解放された札と、所持している札は別です。</p>';
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
 const titles={review:dirty()?'現在と変更案':committedFlash?'確定後の編成':'現在の編成',records:'調査記録',menu:'メニュー',help:'遊び方',settings:'表示',data:'保存データ',receipt:'帰還の内訳',destination:title,unavailable:'購入・所持',notice:'操作の確認',purchase:'購入の確認',conversion:'着想に変える',texts:'文章の記録'};
 let body='',actions='';
 if(panel==='review'){body=wallet()+(dirty()?changeRows()+purchasePlanControls():'<h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>');actions=dirty()?button('確定','commit','data-j-mutation '+(!state.comparison?.ok?'disabled':''),'cj-primary')+button('確定して出発','depart','data-j-mutation '+(!state.comparison?.ok?'disabled':'')):'';}
 if(panel==='receipt')body=receiptDetails();
 if(panel==='destination')body='<p>'+esc(d().texts?.[d().case.objective_text_id]?.short_text||'目的は出発後の本文で確認できます')+'</p><h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>';
 if(panel==='purchase')({body,actions}=purchasePanel());
 if(panel==='conversion')({body,actions}=conversionPanel());
 if(panel==='texts')body=textHistoryView();
 if(panel==='notice'){body='<p>'+esc(reason(state.error))+'</p>';actions=(state.canRetry?button('もう一度','retry'):'')+(state.stale?button('最新を読む','refresh'):'');}
 if(panel==='records')body=recordsView();
 if(panel==='menu'){
  const items=[['調査記録','records'],['表示','settings'],['遊び方','help'],['保存データ','data'],...(h()?[['購入','offers'],['所持','owned']]:[]),['文章の記録','texts'],...(canSuspend()?[['探索を中断','suspend']]:[]),...(dirty()?[['変更案を戻す','discard']]:[])];
  const width=Math.min(340,panelTrail.length?(frameWidth-24)/2:frameWidth-16),height=Math.min(350,frameWidth*9/16-16),cols=width>=280?2:1,rows=Math.max(1,Math.floor((height-96)/44)),capacity=rows*cols,pages=Math.ceil(items.length/capacity);
  menuPage=Math.min(menuPage,pages-1);body='<nav class="cj-menu-grid" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+items.slice(menuPage*capacity,(menuPage+1)*capacity).map(([label,action])=>button(label,action)).join('')+'</nav>';
  actions=pages>1?button(icon('chevron-left'),'menu-page','data-step="-1" aria-label="前のメニュー" '+(!menuPage?'disabled':''))+'<span>'+(menuPage+1)+'/'+pages+'</span>'+button(icon('chevron-right'),'menu-page','data-step="1" aria-label="次のメニュー" '+(menuPage+1===pages?'disabled':'')):'';
 }
 if(panel==='settings')body='<label class="cj-setting"><input type="checkbox" data-motion '+(root.dataset.motion==='reduced'?'checked':'')+'> 動きを抑える</label>';
 if(panel==='help')body='<h3>編成</h3><p>札の＋／−で枚数を変える。心得は「覚えるだけ」と「覚えて装備」を選べる。「習得済み」「装備中」で現在の状態を確認する。名前を押すと発動条件と効果を確認できる。</p><p>着想と構成の差分を見て確定すると、自動保存される。札組と心得の切替では、編集中の内容はそのまま残る。</p><h3>探索</h3><p>「探索を中断」で進行を止め、「続きから」で同じ探索に戻る。中断では撤退・帰還しない。</p><p>札を選び、相手をタップして対象を指定する。相手を押し続けると詳細。情報ボタンからも選択中の相手を確認できる。</p><p>予測はもう一度押すと閉じる。札を押し続けて場へ運ぶ操作も使える。低い画面では、同じ札をもう一度押すと札の詳細。</p><h3>予測</h3><p>選んだ札の直後の変化を表示する。隠蔽は攻撃による減少後・再設定前の値。機転などは消費も含む一手解決後の差分。続く相手の行動は含まない。行動予約の「次」は、選んだ行動の後の本人の予約。同時刻の相手は一組で示す。途中の行動で順序や到達可否は変わる。</p><h3>身構と攪乱</h3><p>複数の発生源から受けた防御を合計して表示する。回数が異なる組は「混在」。詳細で内訳を確認できる。</p><h3>購入と所持</h3><p>候補から購入すると所持に加わる。「編成と比較」では購入と札組・心得の変更を一緒に確定できる。心得を買っても、まだ覚えていなければ別に習得が必要。所持品を「保護」すると、着想への変換を防ぐ。「着想に変える」とその個体は失われる。</p><h3>詳細窓</h3><p>ピンで固定し、もう一度押すと固定を外す。矢印で元の窓に戻る。</p><div class="cj-help-symbols">'+[['arrow-up-right','突破'],['scan-search','探査'],['venetian-mask','隠蔽'],['zap','機転'],['shield','身構'],['wind','攪乱']].map(([symbol,label])=>'<span>'+icon(symbol)+label+'</span>').join('')+'</div>';
 if(panel==='data'){body='<p>'+(storageMode==='ephemeral'?'この試作は、閉じると保存が失われます。':'確定した操作は自動保存されます。')+'</p>'+(d().phase==='home'?'<p>編成は「確定」で保存します。編集中の内容は、確定するまで保存済みの編成を変えません。</p>':'')+'<p>書き出しは保存済みの内容です。</p>';actions=button('書き出す','export','data-j-mutation')+(canSuspend()?button('探索を中断','suspend','data-j-mutation'):'');}
 return '<section class="cj-inspect-item" data-inspect-key="'+panel+'"><div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2>'+titles[panel]+'</h2>'+button(icon('x'),'close','aria-label="窓を閉じる"','cj-icon-button')+'</div><div class="cj-inspect-scroll">'+body+'</div><div class="cj-detail-actions">'+actions+'</div></section>';
}

 function resetWindows(){panel=null;windows=[];panelTrail=[];recordParentRect=null;recordTarget=null;recordDetail=null;detailFromRecords=false;windowAnchor=null;scrollMemory.clear();}
 function paneRect(b){const a=b.closest('[data-inspect-key]')?.getBoundingClientRect(),r=$('.cj-shell').getBoundingClientRect();return a?.width?{left:a.left-r.left,top:a.top-r.top,width:a.width,height:a.height}:null;}
 function enterPanel(b,next){
  const pane=b.closest('[data-inspect-key]'),level=Number(pane?.dataset.level);
  if(!pane){panelTrail=[];recordParentRect=null;return;}
  if(Number.isInteger(level)&&level<panelTrail.length){const parent=panelTrail[level];panel=parent.panel;windows=clone(parent.windows);panelTrail=panelTrail.slice(0,level);}
  if(panel!==next)panelTrail.push({panel,windows:clone(windows),rect:paneRect(b)});
 }
 function windowBack(){if(panel==='details'&&!panelTrail.length&&windows.length>2){windows.pop();render();return;}const previous=panelTrail.pop();if(previous){panel=previous.panel;windows=previous.windows;}else{panel=null;windows=[];}recordDetail=null;recordTarget=null;recordParentRect=null;render();}
 function focusRecord(){queueMicrotask(()=>{if(!disposed)$('[data-j="record-back"]')?.focus({preventScroll:true});});}
 function rememberAnchor(button){const r=button.getBoundingClientRect();windowAnchor={action:button.dataset.j,id:button.dataset.id,rect:{left:r.left,top:r.top,width:r.width,height:r.height}};}
 function layoutWindows(){
  if(disposed)return;const box=$('[data-inspector]');if(!box||box.hidden){api.layoutProse(root);return;}
  const r=$('.cj-shell').getBoundingClientRect();if(!r.width||!r.height)return;
  const source=[...root.querySelectorAll('[data-j]')].find(el=>el.dataset.j===windowAnchor?.action&&el.dataset.id===windowAnchor?.id&&!el.closest('[data-inspector]'));
  const a=source?.getBoundingClientRect()||windowAnchor?.rect,anchor=a?{x:a.left-r.left,y:a.top-r.top,w:a.width,h:a.height}:null;
  const many=box.children.length>1;
  const rect=api.placeWindow({width:r.width,height:r.height,anchor,avoid:[{x:0,y:0,w:r.width,h:44},{x:0,y:r.height-44,w:r.width,h:44}],preferredWidth:340,preferredHeight:Math.min(350,r.height-16)});
  const styles=q=>({left:q.left+'px',top:q.top+'px',width:q.width+'px',height:q.height+'px',right:'auto',bottom:'auto',maxHeight:'none'});
  if(many){
   Object.assign(box.style,styles({left:0,top:0,width:r.width,height:r.height}));
   const parent=recordParentRect||panelTrail.at(-1)?.rect||rect;
   const pair=api.placeWindowPair({width:r.width,height:r.height,parent});
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
  $('[data-header]').hidden=screen==='explore';
  if(screen!==lastScreen){child?.dispose();child=null;$('[data-main]').replaceChildren();if(screen==='explore')child=api.mountExploration($('[data-main]'),{session,display_data:d(),onScene:()=>{sceneRequested=true;render();},onWithdraw:()=>perform('withdraw'),onCommon:(kind,source,key)=>{rememberAnchor(source);panelTrail=[];panel=key?kind:panel===kind?null:kind;recordTab='targets';recordTarget=key||null;recordDetail=null;render();}});lastScreen=screen;}
  if(screen==='explore')child?.update(d(),state);
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
 async function depart(){await sequence(async()=>{if(!await toHome())return;
   if(dirty()){const comparison=await session.compare();if(!comparison.ok){place='compose';return;}const result=await session.execute('commit_preparation',{plan:p()});if(!result.ok){continuation='depart';return;}message='編成を確定しました';}
   const result=await session.execute('depart',{case_id:d().case.id});if(result.ok){panel=null;windows=[];continuation=null;sceneRequested=false;}else continuation='depart';
  });}
 async function commit(){await sequence(async()=>{const result=await session.compare();if(!result.ok)return;const saved=await session.execute('commit_preparation',{plan:p()});if(saved.ok){panel=null;windows=[];committedFlash=true;message='編成を確定';}});}
 root.addEventListener('click',async event=>{
  const b=event.target.closest('[data-j]');if(!b){if(panel&&!event.target.closest('[data-inspector]')){panel=null;windows=[];render();}return;}if(!root.contains(b)||b.disabled)return;
  const action=b.dataset.j,id=b.dataset.id,base=info(id).base_id;
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
 return {session,ready,state:()=>({tab,skillFilter,place,panel,panelTrail:clone(panelTrail),pageAnchors:clone(pageAnchors),recordTab,recordTarget,recordDetail:clone(recordDetail),windows:clone(windows),screen:currentScreen(),seen:[...seen],visible:[...visible]}),dispose(){disposed=true;observer?.disconnect();frameObserver.disconnect();off();events.abort();child?.dispose();session.dispose();}};
};
})(globalThis.CrossweaveUI);
