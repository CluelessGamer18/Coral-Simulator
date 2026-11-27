import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { asset } from "../assetUrl.js";
import "../styles/About.css";

// The marine life the design team researched for the game
const MARINE_LIFE = [
    { name: "French Angelfish", image: "assets/fish/angelfish.png" },
    { name: "Barracuda", image: "assets/fish/barracuda.png" },
    { name: "Yellow Boxfish", image: "assets/fish/boxfish.png" },
    { name: "Yellow Longnose Butterflyfish", image: "assets/fish/butterflyfish.png" },
    { name: "Clownfish", image: "assets/fish/clownfish.png" },
    { name: "Jellyfish", image: "assets/fish/jellyfish.png" },
    { name: "Lionfish", image: "assets/fish/lionfish.png" },
    { name: "Moorish Idol", image: "assets/fish/moorish_idol.png" },
    { name: "Regal Tang", image: "assets/fish/regal_tang.png" },
    { name: "School", image: "assets/fish/schooling_fish.png" },
    { name: "Seahorse", image: "assets/fish/seahorse.png" },
    { name: "Stingray", image: "assets/fish/stingray.png" },
    { name: "Picasso Triggerfish", image: "assets/fish/triggerfish.png" },
    { name: "Sea Turtle", image: "assets/fish/turtle.png" },
    { name: "Yellow Tang", image: "assets/fish/yellow_tang.png" },
];

const RESOURCES = [
    { title: "Kāne'ohe Bay Coral Reef Resilience Study", url: "https://peerj.com/articles/950/" },
    { title: "NOAA Coral Reef Conservation Program", url: "https://coralreef.noaa.gov/" },
    {
        title: "Coral Reef Species Diversity Shuffles But Does Not Decline Under Climate Change",
        url: "https://www.pnas.org/doi/full/10.1073/pnas.2103275118",
    },
    {
        title: "Coral Reef Communities Are Not Doomed By Climate Change",
        url: "https://www.pnas.org/doi/full/10.1073/pnas.2407112121",
    },
    { title: "Dr. R. Toonen Research", url: "https://tobolab.org/rob-toonen/" },
    {
        title: "Dr. R. Shaw Research",
        url: "https://www.macewan.ca/academics/academic-departments/biological-sciences/our-people/profile/?profileid=shawr",
    },
];

const SOUND_CREDITS = [
    {
        text: "Reef recordings: Mikul Rai, Coral Reef Bioacoustics (Moreton Bay), CC BY 4.0. Filtered and looped.",
        url: "https://huggingface.co/datasets/mikulrai/coral-reef-bioacoustics",
    },
    { text: "Reef fish and whale calls: Sounds by Shellfegio / Oceane Boulais, CC BY 4.0. Filtered and trimmed." },
    {
        text: "Triggerfish drumrolls: Raick X, Lecchini D, Kéver L, Colleye O, Bertucci F, Parmentier É 2018, Journal of Experimental Biology 221(1). Filtered and trimmed.",
        url: "https://doi.org/10.1242/jeb.168948",
    },
    {
        text: "Waves: Waves_WashingThroughCoral.wav by floating tree, CC0. Filtered and looped.",
        url: "https://freesound.org/s/253607/",
    },
];

// The words in the team picture (assets/about/team_text.png), for screen readers
const TEAM_TEXT =
    "Hello from the Coral Life Watch development team! Thank you for exploring our simulation—we hope it helped you better understand coral reef bleaching and the important role reefs play in ocean ecosystems. " +
    "This project was created by MacEwan University students as part of the DESN 443/BCS EEE capstone to educate and engage users through interactive learning. " +
    "Special thanks to Dr. Ross Shaw for his work at the intersection of biology, education, and immersive technology, and to Dr. Robert J. Toonen, a leading researcher in coral reef ecology and climate resilience, for their valuable contributions. We also thank Rob Toonan and the professors of DESN 445 and COMP 111 for their guidance and support. " +
    "If you enjoyed the simulation, we encourage you to share it with your friends—explore the process together and spark meaningful conversations about your discoveries!";

/**
 * About the game: what it is, the marine life in it, further reading and credits, and the team.
 * @param {{ backLabel?: string }} props backLabel: the back button's text, which depends on where the player came from
 */
function About({ backLabel = "Back to Title" }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Opened at a section (Resources, from the Options menu): scroll to it
    useEffect(() => {
        if (!location.hash) return;
        document.getElementById(location.hash.slice(1))?.scrollIntoView();
    }, [location.hash]);

    return (
        <div className="AboutPage">
            <img src={asset("assets/about/background_coral.png")} alt="" className="AboutBackgroundImage" />

            <button type="button" className="AboutBackButton" onClick={() => navigate("/")}>
                {backLabel}
            </button>

            <nav className="AboutNav">
                <a href="#overview">Overview</a>
                <a href="#content">Content</a>
                <a href="#resources">Resources</a>
                <a href="#the-team">The Team</a>
            </nav>

            <h1 className="AboutTitle">About Coral Life Watch</h1>

            <section id="overview" className="AboutSection">
                <h2 className="AboutSectionTitle">Overview</h2>
                <p>
                    Coral Life Watch is an interactive simulation that explores how coral reefs respond to environmental
                    changes.
                </p>
            </section>

            <section id="content" className="AboutSection">
                <h2 className="AboutSectionTitle">Content</h2>
                <p>
                    To create a realistic simulation, our design team researched the marine life found in coral reef
                    ecosystems.
                </p>
                <div className="ContentGrid">
                    {MARINE_LIFE.map((item) => (
                        <div className="ContentItem" key={item.name}>
                            <img src={asset(item.image)} alt={item.name} className="ContentItemImage" />
                            <p>{item.name}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="resources" className="AboutSection">
                <h2 className="AboutSectionTitle">Resources</h2>
                <div className="ResourceGrid">
                    {RESOURCES.map((resource) => (
                        <a
                            key={resource.url}
                            className="ResourceCard"
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {resource.title}
                        </a>
                    ))}
                </div>
                <h3 className="AboutSubheading">Ocean Sounds Credits</h3>
                <ul className="SoundCredits">
                    {SOUND_CREDITS.map(({ text, url }) => (
                        <li key={text}>
                            {url ? (
                                <a href={url} target="_blank" rel="noreferrer">
                                    {text}
                                </a>
                            ) : (
                                text
                            )}
                        </li>
                    ))}
                </ul>
            </section>

            <section id="the-team" className="AboutSection">
                <h2 className="AboutSectionTitle">Meet the Team!</h2>
                <div className="TeamLayout">
                    <img className="TeamImage" src={asset("assets/about/team.png")} alt="The Coral Life Watch team" />
                    <img className="TeamTextImage" src={asset("assets/about/team_text.png")} alt={TEAM_TEXT} />
                </div>
            </section>
        </div>
    );
}

export default About;
