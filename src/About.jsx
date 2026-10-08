import "./styles/About.css";
import { useNavigate } from "react-router";
import { asset } from "./assetUrl";

function About() {
    const navigate = useNavigate();

    const contentItems = [
        {name: "French Angelfish", image: "assets/fish/angelfish.png"},
        {name: "Baracuda", image: "assets/fish/baracuda.png"},
        {name: "Yellow Boxfish", image: "assets/fish/boxfish.png"},
        {name: "Yellow Longnose Butterflyfish", image: "assets/fish/butterflyfish.png"},
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

    const resources = [
        {title: "Kāne'ohe Bay Coral Reef Resilience Study", url: "https://peerj.com/articles/950/"},
        {title: "NOAA Coral Reef Conservation Program", url: "https://coralreef.noaa.gov/"},
        {title: "Coral Reef Species Diversity Shuffles But Does Not Decline Under Climate Change", url: "https://www.pnas.org/doi/full/10.1073/pnas.2103275118"},
        {title: "Coral Reef Communities Are Not Doomed By Climate Change", url: "https://www.pnas.org/doi/full/10.1073/pnas.2407112121"},
        {title: "Dr. R. Toonen Research", url: "https://tobolab.org/rob-toonen/"},
        {title: "Dr. R. Shaw Research", url: "https://www.macewan.ca/academics/academic-departments/biological-sciences/our-people/profile/?profileid=shawr"},
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
                <div className = "ResourceGrid">
                    {resources.map((resource) => (
                        <a
                        key={resource.url}
                        className = "ResourceCard"
                        href = {resource.url}
                        target="_blank"
                        rel="noreferrer"
                        >
                            {resource.title}
                        </a>
                    ))}
                </div>
            </section>

            {/* The Team Section */}
            <section id="the-team" className="AboutSection">
                <h1>Meet the Team!</h1>
                <div className = "TeamLayout">
                    <img className = "TeamImage" src={asset("assets/background/TheTeam.png")} alt="The Team" />
                    <img className = "TeamTextImage" src={asset("assets/background/TeamText.png")} alt="Team Text" />
                </div>
            </section>
        </div>
    );
}

export default About;