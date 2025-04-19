<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# write a plan for me to have a react component to be rendered in docusaurus so that

1. the component allows me to expand or contract all collapsible items on the page
2. the component should be in typescript with generics, so that any new component I make, I can write it up with this and make it work.
3. it should toggle the expand all and collapse all component features

To create a React component for Docusaurus that manages expand/collapse functionality with TypeScript generics, follow this implementation plan:

### 1. Create Context Provider (State Management)

```typescript
// src/components/CollapseContext.tsx
import React, { createContext, useContext } from 'react';

type CollapseState&lt;T extends string&gt; = Record&lt;T, boolean&gt;;
type CollapseContextType&lt;T extends string&gt; = {
  state: CollapseState&lt;T&gt;;
  toggleAll: (expand: boolean) =&gt; void;
};

const CollapseContext = createContext&lt;CollapseContextType&lt;any&gt; | null&gt;(null);

export function CollapseProvider&lt;T extends string&gt;({
  children,
  items,
}: {
  children: React.ReactNode;
  items: T[];
}) {
  const [state, setState] = React.useState&lt;CollapseState&lt;T&gt;&gt;(
    Object.fromEntries(items.map(id =&gt; [id, false])) as CollapseState&lt;T&gt;
  );

  const toggleAll = (expand: boolean) =&gt; {
    setState(prev =&gt; Object.fromEntries(
      Object.keys(prev).map(id =&gt; [id, expand])
    ) as CollapseState&lt;T&gt;);
  };

  return (
    &lt;CollapseContext.Provider value={{ state, toggleAll }}&gt;
      {children}
    &lt;/CollapseContext.Provider&gt;
  );
}

export function useCollapseContext&lt;T extends string&gt;() {
  const context = useContext(CollapseContext);
  if (!context) throw new Error('Must be used within CollapseProvider');
  return context as CollapseContextType&lt;T&gt;;
}
```


### 2. Create Generic Collapse Component

```typescript
// src/components/GenericCollapse.tsx
import React from 'react';
import { useCollapseContext } from './CollapseContext';

type CollapseProps&lt;T extends string&gt; = {
  id: T;
  header: React.ReactNode;
  children: React.ReactNode;
};

export function GenericCollapse&lt;T extends string&gt;({
  id,
  header,
  children,
}: CollapseProps&lt;T&gt;) {
  const { state } = useCollapseContext&lt;T&gt;();
  
  return (
    <div>
      &lt;details open={state[id]}&gt;
        &lt;summary&gt;{header}&lt;/summary&gt;
        <div>{children}</div>
      &lt;/details&gt;
    </div>
  );
}
```


### 3. Create Toggle Controls Component

```typescript
// src/components/CollapseControls.tsx
import React from 'react';
import { useCollapseContext } from './CollapseContext';

export function CollapseControls&lt;T extends string&gt;() {
  const { toggleAll } = useCollapseContext&lt;T&gt;();

  return (
    <div>
      &lt;button onClick={() =&gt; toggleAll(true)}&gt;Expand All&lt;/button&gt;
      &lt;button onClick={() =&gt; toggleAll(false)}&gt;Collapse All&lt;/button&gt;
    </div>
  );
}
```


### 4. Implementation in Docusaurus

```mdx
// docs/example-page.mdx
import { CollapseProvider, GenericCollapse, CollapseControls } from '@site/src/components';

&lt;CollapseProvider items={['section1', 'section2', 'section3']}&gt;
  &lt;CollapseControls /&gt;

  &lt;GenericCollapse 
    id="section1"
    header="First Section Header"&gt;
    Content for first section
  &lt;/GenericCollapse&gt;

  &lt;GenericCollapse 
    id="section2"
    header="Second Section Header"&gt;
    Content for second section
  &lt;/GenericCollapse&gt;
&lt;/CollapseProvider&gt;
```


### Key Features

1. **Type-Safe Generics**: The `T extends string` generic ensures proper type checking for section IDs[^1][^4]
2. **Centralized State Management**: Context API manages all collapse states[^4]
3. **Dynamic Control**: `toggleAll` handles bulk expand/collapse operations[^4]
4. **MDX Compatibility**: Works seamlessly with Docusaurus' Markdown/MDX system[^1][^3]

### Implementation Steps

1. Create all components in `/src/components`
2. Add TypeScript type definitions if needed
3. Import and wrap content sections with `CollapseProvider`
4. Use `GenericCollapse` for each collapsible section
5. Place `CollapseControls` wherever needed in the layout

This solution provides type-safe collapsible sections while maintaining compatibility with Docusaurus' ecosystem[^1][^3]. The generic implementation allows easy reuse across different documentation sections[^2][^4].

<div style="text-align: center">⁂</div>

[^1]: https://stackoverflow.com/questions/60827828/docusaurus-v2-collapsible-section-in-markdown

[^2]: https://github.com/facebook/docusaurus/issues/1084

[^3]: https://docusaurus.io/docs/sidebar

[^4]: https://www.geeksforgeeks.org/how-to-use-collapse-component-in-reactjs/

[^5]: https://docusaurus.io/feature-requests/p/collapse-expand-all-sections-button-in-sidebar

[^6]: https://github.com/reactstrap/reactstrap/issues/556

[^7]: https://docusaurus.io/feature-requests/p/collapsible-admonitions

[^8]: https://app.renovatebot.com/package-diff?name=%40sanity%2Flocale-ko-kr\&from=1.1.11\&to=1.1.12



------

MORE DETAILED GUIDE 


<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Creating a Universal Collapsible Controller for Docusaurus in TypeScript

This report presents a comprehensive TypeScript React component for Docusaurus that provides "Expand All" and "Collapse All" functionality for collapsible elements. The component uses generics for type safety and flexibility, making it reusable across different types of collapsible content.

## Component Design and Implementation

The `CollapsibleControls` component provides a unified interface to control various types of collapsible elements on a page, whether they are native HTML elements or custom React components.

```tsx
import React, { useState, useEffect } from 'react';

/**
 * Interface for a collapsible element handler
 */
export interface CollapsibleHandler&lt;T = any&gt; {
  /** Function to find collapsible elements */
  selector: () =&gt; NodeListOf&lt;Element&gt; | Array&lt;Element | T&gt;;
  /** Function to check if an element is expanded */
  isExpanded: (element: T) =&gt; boolean;
  /** Function to expand an element */
  expand: (element: T) =&gt; void;
  /** Function to collapse an element */
  collapse: (element: T) =&gt; void;
}

/**
 * Interface for collapsible React component refs
 */
export interface CollapsibleRef&lt;T = any&gt; {
  /** Reference to the component */
  ref: React.RefObject&lt;T&gt;;
  /** Function to check if the component is expanded */
  isExpanded: (ref: React.RefObject&lt;T&gt;) =&gt; boolean;
  /** Function to expand the component */
  expand: (ref: React.RefObject&lt;T&gt;) =&gt; void;
  /** Function to collapse the component */
  collapse: (ref: React.RefObject&lt;T&gt;) =&gt; void;
}

/**
 * Props for the CollapsibleControls component
 */
export interface CollapsibleControlsProps {
  /** List of handlers for DOM elements */
  handlers?: CollapsibleHandler[];
  /** List of refs to collapsible React components */
  componentRefs?: CollapsibleRef[];
  /** Label for the expand all button */
  expandLabel?: string;
  /** Label for the collapse all button */
  collapseLabel?: string;
  /** CSS class for the buttons */
  buttonClassName?: string;
  /** CSS class for the container */
  containerClassName?: string;
  /** Whether to render two separate buttons (true) or a single toggle button (false) */
  separateButtons?: boolean;
}

/**
 * Default handler for HTML details elements
 */
export const detailsHandler: CollapsibleHandler&lt;HTMLDetailsElement&gt; = {
  selector: () =&gt; document.querySelectorAll('details'),
  isExpanded: (element) =&gt; element.open,
  expand: (element) =&gt; { element.open = true },
  collapse: (element) =&gt; { element.open = false }
};

/**
 * A component that provides controls to expand or collapse all collapsible elements on a page
 */
export function CollapsibleControls({
  handlers = [detailsHandler],
  componentRefs = [],
  expandLabel = 'Expand All',
  collapseLabel = 'Collapse All',
  buttonClassName = '',
  containerClassName = '',
  separateButtons = false,
}: CollapsibleControlsProps) {
  const [allExpanded, setAllExpanded] = useState(false);
  
  // Check if all elements are currently expanded
  const checkAllExpanded = () =&gt; {
    // Check DOM elements
    for (const handler of handlers) {
      const elements = handler.selector();
      for (const element of elements) {
        if (!handler.isExpanded(element as any)) {
          return false;
        }
      }
    }
    
    // Check component refs
    for (const { ref, isExpanded } of componentRefs) {
      if (!isExpanded(ref)) {
        return false;
      }
    }
    
    return true;
  };
  
  // Update the state when the component mounts
  useEffect(() =&gt; {
    setAllExpanded(checkAllExpanded());
    // We deliberately don't include checkAllExpanded in dependencies
    // as it would cause infinite re-rendering
  }, []);
  
  // Function to expand all collapsible elements
  const expandAll = () =&gt; {
    // Expand DOM elements
    handlers.forEach(handler =&gt; {
      const elements = handler.selector();
      elements.forEach(element =&gt; {
        handler.expand(element as any);
      });
    });
    
    // Expand component refs
    componentRefs.forEach(({ ref, expand }) =&gt; {
      expand(ref);
    });
    
    setAllExpanded(true);
  };
  
  // Function to collapse all collapsible elements
  const collapseAll = () =&gt; {
    // Collapse DOM elements
    handlers.forEach(handler =&gt; {
      const elements = handler.selector();
      elements.forEach(element =&gt; {
        handler.collapse(element as any);
      });
    });
    
    // Collapse component refs
    componentRefs.forEach(({ ref, collapse }) =&gt; {
      collapse(ref);
    });
    
    setAllExpanded(false);
  };
  
  // Toggle between expand and collapse
  const toggleAll = () =&gt; {
    if (allExpanded) {
      collapseAll();
    } else {
      expandAll();
    }
  };
  
  // Render separate buttons or a toggle button
  if (separateButtons) {
    return (
      <div>
        &lt;button 
          className={buttonClassName}
          onClick={expandAll}
        &gt;
          {expandLabel}
        &lt;/button&gt;
        &lt;button 
          className={buttonClassName}
          onClick={collapseAll}
        &gt;
          {collapseLabel}
        &lt;/button&gt;
      </div>
    );
  }
  
  // Render a single toggle button
  return (
    <div>
      &lt;button 
        className={buttonClassName}
        onClick={toggleAll}
      &gt;
        {allExpanded ? collapseLabel : expandLabel}
      &lt;/button&gt;
    </div>
  );
}

/**
 * Create a handler for custom DOM-based collapsible components
 */
export function createDOMHandler&lt;T extends Element&gt;({
  selector,
  isExpanded,
  expand,
  collapse
}: CollapsibleHandler&lt;T&gt;): CollapsibleHandler&lt;T&gt; {
  return {
    selector,
    isExpanded,
    expand,
    collapse
  };
}

/**
 * Create a reference to a React collapsible component
 */
export function createComponentRef&lt;T&gt;({
  ref,
  isExpanded,
  expand,
  collapse
}: CollapsibleRef&lt;T&gt;): CollapsibleRef&lt;T&gt; {
  return {
    ref,
    isExpanded,
    expand,
    collapse
  };
}
```


### Key Features

The component offers several key features that make it highly flexible:

1. **TypeScript Generics**: Uses generics to ensure type safety when working with different collapsible element types[^7].
2. **Built-in Support for HTML Details**: Includes a default handler for HTML `&lt;details&gt;` elements, which are commonly used in Markdown for collapsible sections[^1].
3. **Support for Custom Components**: Provides helper functions to create handlers for any custom collapsible component structure.
4. **React Refs Integration**: Works seamlessly with React component references through the `componentRefs` prop.
5. **Toggle Functionality**: Switches between "Expand All" and "Collapse All" states, fulfilling the requirement for toggling[^4][^8].

## Usage Examples

### Basic Usage with HTML Details Elements

The simplest way to use the component is with HTML `&lt;details&gt;` elements in MDX:

```jsx
import { CollapsibleControls } from '@site/src/components/CollapsibleControls';

# My Page with Collapsible Sections

&lt;CollapsibleControls /&gt;

&lt;details&gt;
  &lt;summary&gt;Section 1&lt;/summary&gt;
  <p>Content for section 1</p>
&lt;/details&gt;

&lt;details&gt;
  &lt;summary&gt;Section 2&lt;/summary&gt;
  <p>Content for section 2</p>
&lt;/details&gt;
```


### Custom DOM-based Components

For custom DOM elements that function as collapsible sections:

```jsx
import { CollapsibleControls, createDOMHandler } from '@site/src/components/CollapsibleControls';

// Custom handler for elements with class "accordion"
const accordionHandler = createDOMHandler({
  selector: () =&gt; document.querySelectorAll('.accordion'),
  isExpanded: (element) =&gt; element.classList.contains('expanded'),
  expand: (element) =&gt; element.classList.add('expanded'),
  collapse: (element) =&gt; element.classList.remove('expanded')
});

# My Page with Custom Accordions

&lt;CollapsibleControls 
  handlers={[accordionHandler]} 
  expandLabel="Open All" 
  collapseLabel="Close All" 
/&gt;

<div>
  <div>Section 1</div>
  <div>Content for section 1</div>
</div>
```


### Using with React Component References

For more complex scenarios with custom React components:

```jsx
import React, { useRef } from 'react';
import { CollapsibleControls, createComponentRef } from '@site/src/components/CollapsibleControls';
import Accordion from '@site/src/components/Accordion';

export function MyPage() {
  const accordion1Ref = useRef(null);
  const accordion2Ref = useRef(null);
  
  // Create refs for the accordion components
  const accordionRefs = [
    createComponentRef({
      ref: accordion1Ref,
      isExpanded: (ref) =&gt; ref.current?.isOpen || false,
      expand: (ref) =&gt; ref.current?.setOpen(true),
      collapse: (ref) =&gt; ref.current?.setOpen(false)
    }),
    createComponentRef({
      ref: accordion2Ref,
      isExpanded: (ref) =&gt; ref.current?.isOpen || false,
      expand: (ref) =&gt; ref.current?.setOpen(true),
      collapse: (ref) =&gt; ref.current?.setOpen(false)
    })
  ];
  
  return (
    <div>
      <h1>My Page with React Accordion Components</h1>
      
      &lt;CollapsibleControls 
        componentRefs={accordionRefs}
        separateButtons={true}
        buttonClassName="my-button"
      /&gt;
      
      &lt;Accordion 
        ref={accordion1Ref} 
        title="Section 1"
        initialOpen={true}
      &gt;
        Content for section 1
      &lt;/Accordion&gt;
      
      &lt;Accordion 
        ref={accordion2Ref} 
        title="Section 2"
      &gt;
        Content for section 2
      &lt;/Accordion&gt;
    </div>
  );
}

export default MyPage;
```


## Integration with Docusaurus MDX Documents

Docusaurus has built-in support for MDX, allowing you to write JSX within your Markdown files and render them as React components[^5][^9]. This makes our `CollapsibleControls` component perfectly suited for Docusaurus documents.

### Step 1: Create the Component File

Save the component in your Docusaurus project, typically under `src/components/CollapsibleControls.tsx`.

### Step 2: Import in MDX Files

Import the component directly in your MDX files and use it with collapsible elements:

```mdx
import { CollapsibleControls } from '@site/src/components/CollapsibleControls';

# Document with Collapsible Sections

&lt;CollapsibleControls /&gt;

&lt;details&gt;
  &lt;summary&gt;**Important Information**&lt;/summary&gt;
  This section contains important details that can be expanded and collapsed.
&lt;/details&gt;

&lt;details&gt;
  &lt;summary&gt;**Additional Resources**&lt;/summary&gt;
  Here are some additional resources to explore.
&lt;/details&gt;
```


## Handling Different Collapsible Types

One of the advantages of this component is its ability to handle different types of collapsible elements simultaneously:

```jsx
import React, { useRef } from 'react';
import { 
  CollapsibleControls, 
  detailsHandler, 
  createDOMHandler, 
  createComponentRef 
} from '@site/src/components/CollapsibleControls';
import Accordion from '@site/src/components/Accordion';

export function MixedCollapsiblesPage() {
  const accordionRef = useRef(null);
  
  // Custom handler for other collapsible elements
  const customHandler = createDOMHandler({
    selector: () =&gt; document.querySelectorAll('.custom-collapsible'),
    isExpanded: (element) =&gt; element.getAttribute('data-expanded') === 'true',
    expand: (element) =&gt; element.setAttribute('data-expanded', 'true'),
    collapse: (element) =&gt; element.setAttribute('data-expanded', 'false')
  });
  
  // Reference for React component
  const componentRef = createComponentRef({
    ref: accordionRef,
    isExpanded: (ref) =&gt; ref.current?.isOpen || false,
    expand: (ref) =&gt; ref.current?.setOpen(true),
    collapse: (ref) =&gt; ref.current?.setOpen(false)
  });
  
  return (
    <div>
      &lt;CollapsibleControls 
        handlers={[detailsHandler, customHandler]}
        componentRefs={[componentRef]}
      /&gt;
      
      {/* Mixed collapsible elements */}
    </div>
  );
}
```


## Conclusion

The `CollapsibleControls` component provides a powerful, flexible way to manage collapsible content in Docusaurus documents. By leveraging TypeScript generics, it achieves the following goals:

1. Allows expanding and collapsing all collapsible items on a page with a single click
2. Provides type safety and flexibility through generics, making it work with any new component
3. Implements toggle functionality between expand and collapse states
4. Integrates seamlessly with Docusaurus's MDX content format

This component can be extended further to support additional collapsible element types or customized to match specific UI requirements. The use of TypeScript generics ensures that it remains type-safe while being adaptable to different contexts and component structures.

<div style="text-align: center">⁂</div>

[^1]: https://stackoverflow.com/questions/60827828/docusaurus-v2-collapsible-section-in-markdown

[^2]: https://www.npmjs.com/package/react-collapsible

[^3]: https://github.com/facebook/docusaurus/issues/1084

[^4]: https://stackoverflow.com/questions/68676510/only-allow-one-react-accordion-to-be-expanded-at-once

[^5]: https://docusaurus.io/zh-CN/docs/3.0.1/markdown-features/react

[^6]: https://docusaurus.io/docs/sidebar

[^7]: https://www.totaltypescript.com/tips/use-generics-in-react-to-make-dynamic-and-flexible-components

[^8]: https://stackoverflow.com/questions/63098101/react-accordion-with-expand-all-and-collapse-all

[^9]: https://docusaurus.io/docs/markdown-features/react

[^10]: https://github.com/facebook/docusaurus/issues/7918

[^11]: https://stackoverflow.com/questions/78393218/how-to-programmatically-generate-a-collapsible-menu-with-react/78393270

[^12]: https://docusaurus.io/docs/markdown-features

[^13]: https://stackoverflow.com/questions/58831318/make-sidebar-not-collapsable-and-always-expanded-in-docusaurus-v2-classic-preset

[^14]: https://docusaurus.io/docs/sidebar/items

[^15]: https://docusaurus.io/feature-requests/p/collapsible-admonitions

[^16]: https://github.com/facebook/docusaurus/issues/2354

[^17]: https://docusaurus.io/docs/api/themes/configuration

[^18]: https://docusaurus.io/feature-requests/p/collapsible-parts-of-code-blocks

[^19]: https://docusaurus.io/docs/markdown-features

[^20]: https://dev.to/michaeljota/using-typescript-generics-with-your-react-components-4dde

[^21]: https://docusaurus.canny.io/feature-requests/p/collapse-expand-all-sections-button-in-sidebar

[^22]: https://docusaurus.io/feature-requests/p/collapse-expand-all-sections-button-in-sidebar

[^23]: https://www.youtube.com/watch?v=Hn7iDjbPtVY

[^24]: https://docusaurus.io/docs/3.3.2/api/plugins/@docusaurus/plugin-content-docs

[^25]: https://stackoverflow.com/questions/70401612/how-to-create-a-generic-collapsible-table-with-react-typescript

[^26]: https://docusaurus.io/docs/sidebar

[^27]: https://react-bootstrap.netlify.app/docs/components/accordion/

[^28]: https://ej2.syncfusion.com/react/documentation/accordion/expand-mode

[^29]: https://docusaurus.io/docs/2.x/markdown-features/react

[^30]: https://github.com/facebook/docusaurus/issues/4753

[^31]: https://react-spectrum.adobe.com/react-spectrum/Accordion.html

[^32]: https://github.com/facebook/docusaurus/discussions/10829

[^33]: https://www.npmjs.com/package/react-accessible-accordion

[^34]: https://stackoverflow.com/questions/62022266/how-do-i-embed-global-react-components-in-docusaurus-v2
