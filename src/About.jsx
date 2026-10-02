import "./styles/About.css";
import { useNavigate } from "react-router";
import { asset } from "./assetUrl";

function About() {
    const navigate = useNavigate();

    const contentItems = [
        {name: "French Angelfish", image: "assets/fish/angelfish.png"},
        {name: "Baracuda", image: "assets/fish/baracuda.png"},
        {name: "Yellow Boxfish", image: "assets/fish/boxfish.png"},
        {name: "Yellow Longnose Butterfly Fish", image: "assets/fish/butterflyfish.png"},
        {name: "Clown Fish", image: "assets/fish/clownfish.png"},
        {name: "Jellyfish", image: "assets/fish/jellyfish.png"},
        {name: "Lion Fish", image: "assets/fish/lionfish.png"},
        {name: "Moorish Idol", image: "assets/fish/moorishidol.png"},
        {name: "Regal Tang", image: "assets/fish/regaltang.png"},
        {name: "School", image: "assets/fish/school.png"},
        {name: "Seahorse", image: "assets/fish/seahorse.png"},
        {name: "Stingray", image: "assets/fish/stingray.png"},
        {name: "Picasso Triggerfish", image: "assets/fish/triggerfish.png"},
        {name: "Sea Turtle", image: "assets/fish/turtle.png"},
        {name: "Yellow Tang", image: "assets/fish/yellowtang.png"},
    ]

    const teamItems = [
        {name: "The Team", image: "assets/background/TheTeam.png"},
        {name: "Team Text", image: "assets/background/TeamText.png"},
    ]
    
    return (
        <div className="AboutPage AboutContainer">
            {/* background image */}
            <div className="AboutBackground">
                <img src={asset("aboutPageCoral.png")} alt="Coral Reef Background" className="AboutBackgroundImage" />
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
                <p></p>
                <p>
                    To create a realistic simulation, our design team researched the marine life found in coral reef ecosystems.
                </p>

                <div className="ContentGrid">
                    {contentItems.map((item) => (
                        <div className="ContentItem" key={item.name}>
                            <img src={asset(item.image)} alt={item.name} className="ContentItemImage" />
                            <p>{item.name}</p>
                        </div>
                    ))}
                </div>
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