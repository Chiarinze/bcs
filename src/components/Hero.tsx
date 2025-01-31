export default function Hero() {
  const handleScrollToAbout = () => {
    const aboutSection = document.getElementById("about");
    if (aboutSection) {
      window.scrollTo({
        top: aboutSection.offsetTop - 70,
        behavior: "smooth",
      });
    }
  };

  const handleScrollBookUs = () => {
    const aboutSection = document.getElementById("contact-us");
    if (aboutSection) {
      window.scrollTo({
        top: aboutSection.offsetTop - 70,
        behavior: "smooth",
      });
    }
  };

  return (
    <main
      id="hero"
      className="relative w-full min-h-screen flex justify-center items-center bg-cover bg-center"
    >
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{
          backgroundImage: "url('/bcs4.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black opacity-70"></div>
      </div>

      <div className="relative w-full h-full flex flex-col items-center justify-center text-center text-white px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Musical Excellence:
          <br />
          Where Passion Meets Performance
        </h1>
        <p className="text-lg md:text-xl max-w-3xl">
          Inspiring and empowering young musicians through excellence in choral
          and orchestral performance
        </p>
        <div className="space-x-4">
          <button
            onClick={handleScrollToAbout}
            className="w-38 mt-8 mb-20 border-2 border-[#415C41] bg-transparent shadow-sm backdrop-blur-sm text-white px-8 py-3 rounded-xl hover:bg-[#415C41]"
          >
            Learn more
          </button>
          <button
            onClick={handleScrollBookUs}
            className="w-38 mt-8 mb-20 bg-[#415C41] text-white px-8 py-3 rounded-xl hover:opacity-80 transition-opacity"
          >
            Book us
          </button>
        </div>
      </div>
    </main>
  );
}
