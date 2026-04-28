"use client";

const images = [
  { front: "https://qodeinteractive.com/magazine/wp-content/uploads/2020/06/8-Tyler-the-Creator.jpg", back: "https://www.indieground.net/images/blog/2024/indieblog-best-album-covers-2010s-04.jpg" },
  { front: "https://www.indieground.net/images/blog/2024/indieblog-best-album-covers-2010s-04.jpg", back: "https://qodeinteractive.com/magazine/wp-content/uploads/2020/06/8-Tyler-the-Creator.jpg" },
  { front: "https://res.cloudinary.com/ybmedia/image/upload/c_crop,h_1323,w_1985,x_0,y_193/c_fill,f_auto,h_1200,q_auto,w_1600/v1/m/b/8/b8601cf5a1ce6be0421f710c8cdf89f05db3dd97/GettyImages-74290244.jpg", back: "https://www.billboard.com/wp-content/uploads/2022/03/35.-Metallica-%E2%80%98Master-of-Puppets-1986-album-art-billboard-1240.jpg?w=600" },
  { front: "https://www.billboard.com/wp-content/uploads/2022/03/35.-Metallica-%E2%80%98Master-of-Puppets-1986-album-art-billboard-1240.jpg?w=600", back: "https://res.cloudinary.com/ybmedia/image/upload/c_crop,h_1323,w_1985,x_0,y_193/c_fill,f_auto,h_1200,q_auto,w_1600/v1/m/b/8/b8601cf5a1ce6be0421f710c8cdf89f05db3dd97/GettyImages-74290244.jpg" },
];

export default function AuthBackground() {
  return (
    <div className="auth-bg">
      {images.map((img, i) => (
        <div key={i} className="flip-card">
          <div className="flip-inner">
            <div className="flip-front" style={{ backgroundImage: `url(${img.front})` }} />
            <div className="flip-back" style={{ backgroundImage: `url(${img.back})` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
