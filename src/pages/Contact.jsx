import React from "react";
import { Button, Form, Input } from "antd";

const layout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
};

const validateMessages = {
  required: "${label} is required!",
  types: {
    email: "${label} is not a valid email!",
  },
};

const onFinish = (values) => {
  console.log(values);
};

const Contact = () => (
  <div className="bg-white">
    {/* Hero Section */}
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-purple-700 opacity-90"></div>
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
        }}
      ></div>
      <div className="relative max-w-4xl mx-auto py-20 px-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
          Contact Us
        </h1>
        <p className="mt-4 text-lg text-blue-100">
          Have questions about <span className="font-semibold">ARTDUNIYA</span>?  
          We’re here to help. Fill out the form below and our team will get back
          to you shortly.
        </p>
      </div>
    </div>

    {/* Contact Form Section */}
    <div className="flex justify-center items-center py-16 bg-gray-50 px-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 sm:p-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
          Get in Touch
        </h2>
        <p className="text-md text-center text-gray-500 mb-8">
          We’d love to hear from you. Please provide your details below.
        </p>

        <Form
          {...layout}
          name="contact-form"
          onFinish={onFinish}
          validateMessages={validateMessages}
          className="flex flex-col gap-4"
        >
          {/* Name */}
          <Form.Item
            name={["user", "name"]}
            label={<span className="text-gray-700 text-lg">Name</span>}
            rules={[{ required: true }]}
          >
            <Input className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 !py-2 !text-base" />
          </Form.Item>

          {/* Email */}
          <Form.Item
            name={["user", "email"]}
            label={<span className="text-gray-700 text-lg">Email</span>}
            rules={[{ type: "email", required: true }]}
          >
            <Input className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 !py-2 !text-base" />
          </Form.Item>

          {/* Description */}
          <Form.Item
            name={["user", "description"]}
            label={<span className="text-gray-700 text-lg">Message</span>}
          >
            <Input.TextArea
              rows={5}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 !text-base"
            />
          </Form.Item>

          {/* Submit Button */}
          <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
            <Button
              type="primary"
              htmlType="submit"
              className="bg-purple-600 hover:bg-purple-700 transition text-white font-medium !text-lg !px-8 !py-4 rounded-lg"
            >
              Send Message
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  </div>
);

export default Contact;
