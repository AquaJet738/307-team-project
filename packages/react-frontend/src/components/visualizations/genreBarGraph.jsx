import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components, necessary to avoid errors
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// text color to white to better contrast with dark mode background
ChartJS.defaults.color = "#FFFFFF";

const GenreBarGraph = ({ genreData, yMax }) => {
  // extract labels and counts from the array of objects
  const genreLabels = genreData.map((genre) => genre.genre);
  const genreCounts = genreData.map((genre) => parseFloat(genre.percentage));

  const data = {
    labels: genreLabels,
    datasets: [
      {
        label: "Genres Listened to By %",
        data: genreCounts,
        backgroundColor: "rgba(29, 185, 84, 0.6)", // Spotify green color with opacity
        borderColor: "rgba(29, 185, 84, 1)", // Spotify green color
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        min: 0,
        max: yMax,
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default GenreBarGraph;
