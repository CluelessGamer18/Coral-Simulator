import "./styles/About.css";
import { useNavigate } from "react-router-dom";

function About() {
    const navigate = useNavigate();
    
    return (
        <div className="AboutPage AboutContainer">
            {/* background image */}
            <div className="AboutBackground">
                <img src="aboutPageCoral.png" alt="Coral Reef Background" className="AboutBackgroundImage" />
            </div>

            {/* Back Button */}
            <button
                className="BackToTitleButton"
                onClick={() => navigate("/")}
            >
                Back to Title
            </button>

            {/* Navigation Menu */}
            <nav className="AboutNav">
                <a href="#overview">Overview</a>
                <a href="#content">Content</a>
                <a href="#resources">Resources</a>
                <a href="#the-team">The Team</a>
            </nav>

            {/* Overview Section */}
            <section id="overview" className="AboutSection">
                <h1>Overview</h1>
                <p>
                    Coral Life Watch is an interactive simulation that explores
                    how coral reefs respond to environmental changes.
                </p>
            </section>

            {/* Content Section */}
            <section id="content" className="AboutSection">
                <h1>Content</h1>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
            </section>

            {/* Resources Section */}
            <section id="resources" className="AboutSection">
                <h1>Resources</h1>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
            </section>

            {/* The Team Section */}
            <section id="the-team" className="AboutSection">
                <h1>The Team</h1>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
            </section>
        </div>
    );
}

export default About;