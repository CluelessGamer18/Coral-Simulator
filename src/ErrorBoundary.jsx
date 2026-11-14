import { Component } from 'react'
import ProblemScreen from './ProblemScreen.jsx'

// Catches an error thrown while React is drawing the page, which would otherwise leave it blank,
// and offers a reload instead.
class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.failed) return <ProblemScreen title="Something went wrong" message="The game hit a problem it couldn't recover from." />;
    return this.props.children;
  }
}

export default ErrorBoundary
