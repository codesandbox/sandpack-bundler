import * as babel from "@babel/standalone";
import { collectDependencies } from "./transformers/js/dep-collector";

const CODE = `import ReactDOM from 'react-dom';

console.log("test");

const React = require('react');

export const App = () => {
	return <div>test</div>
}

ReactDOM.render(<App />, document.getElementById('app'));
`;

const requires: Set<string> = new Set();
const transformed = babel.transform(CODE, {
  presets: ["env", "react"],
  plugins: [collectDependencies(requires)],
  ast: true
});

console.log(transformed);
console.log(requires);
